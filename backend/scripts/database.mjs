import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';
import postgres from '@prisma/orm-postgres/runtime';
import contractJson from '../src/prisma/contract.json' with { type: 'json' };

config({
  path: fileURLToPath(new URL('../.env', import.meta.url)),
  quiet: true,
});

const action = process.argv[2];
if (!['check', 'seed', 'cleanup'].includes(action)) {
  console.error('Use: node scripts/database.mjs check|seed|cleanup');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error(
    'Configure DATABASE_URL no arquivo backend/.env. Consulte .env.example.',
  );
  process.exit(1);
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
  query_timeout: 10000,
});
let db;
try {
  await client.connect();
  const {
    rows: [info],
  } = await client.query(
    "SELECT current_database() AS database, current_setting('server_version') AS version",
  );
  console.log(
    `Conectado ao banco ${info.database} (PostgreSQL ${info.version}).`,
  );
  const {
    rows: [tables],
  } = await client.query(
    `SELECT to_regclass('public."role"') AS role, to_regclass('public."user"') AS users`,
  );
  if (!tables.role || !tables.users) {
    throw Object.assign(new Error(), { code: 'SCHEMA_MISSING' });
  }

  if (action === 'seed') {
    await client.query('BEGIN');
    for (const { value } of contractJson.domain.namespaces.public.enum.RoleName
      .members) {
      await client.query(
        'INSERT INTO public."role" (name, "updatedAt") VALUES ($1, now()) ON CONFLICT (name) DO NOTHING',
        [value],
      );
    }
    await client.query('COMMIT');
    console.log(
      'Perfis iniciais cadastrados; perfis existentes foram preservados.',
    );
  }

  if (action === 'cleanup') {
    await client.query('BEGIN');
    for (const table of ['session', 'passwordReset', 'loginAttempt']) {
      await client.query(
        `DELETE FROM public."${table}" WHERE "expiresAt" <= now()`,
      );
    }
    await client.query('COMMIT');
    console.log('Sessões, códigos e limites expirados removidos.');
  }

  db = postgres({
    contractJson,
    url: process.env.DATABASE_URL,
    poolOptions: { connectionTimeoutMillis: 5000 },
  });
  const roles = await db.orm.public.Role.all();
  // Exercise the same ORM used by the API without printing user records.
  await db.orm.public.User.first({ id: -1 });
  await db.orm.public.Session.first({ tokenHash: 'diagnostic-nonexistent' });
  await db.orm.public.PasswordReset.first({
    tokenHash: 'diagnostic-nonexistent',
  });
  await db.orm.public.LoginAttempt.first({ key: 'diagnostic-nonexistent' });
  await db.orm.public.News.first({ id: -1 });
  await db.orm.public.Community.first({ id: -1 });
  await db.orm.public.Membership.first({ id: -1 });
  await db.orm.public.CommunityPost.first({ id: -1 });
  await db.orm.public.Comment.first({ id: -1 });
  console.log(
    `Consultas Prisma concluídas. Perfis disponíveis: ${roles.length}.`,
  );
} catch (error) {
  const code = typeof error?.code === 'string' ? error.code : 'UNKNOWN';
  const messages = {
    '28P01': 'Usuário ou senha do PostgreSQL incorretos.',
    '3D000':
      'O banco configurado não existe. Crie-o antes de inicializar as tabelas.',
    ECONNREFUSED: 'PostgreSQL indisponível no endereço configurado.',
    SCHEMA_MISSING:
      'Tabelas ausentes. Inicialize o banco de desenvolvimento com npm run db:init.',
  };
  console.error(
    messages[code] ??
      `Não foi possível validar o banco (${code}). Verifique a configuração e o contrato Prisma.`,
  );
  process.exitCode = 1;
} finally {
  await db?.close();
  await client.end();
}
