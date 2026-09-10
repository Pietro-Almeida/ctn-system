import 'reflect-metadata';
import { config } from 'dotenv';
import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { Client } from 'pg';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateUserDto } from '../dist/modules/users/dto/create-user.dto.js';
import { hashPassword } from '../dist/modules/auth/password.js';

config({ path: new URL('../.env', import.meta.url), quiet: true });
if (!process.stdin.isTTY) throw new Error('Execute em um terminal interativo.');
if (!process.env.DATABASE_URL)
  throw new Error('Configure DATABASE_URL no .env.');
let hidden = false;
const output = new Writable({
  write(chunk, encoding, done) {
    if (!hidden) process.stdout.write(chunk, encoding);
    done();
  },
});
const rl = createInterface({ input: process.stdin, output, terminal: true });
async function password(prompt) {
  process.stdout.write(prompt);
  hidden = true;
  try {
    return await rl.question('');
  } finally {
    hidden = false;
    process.stdout.write('\n');
  }
}
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
});
try {
  await client.connect();
  const existing = await client.query(
    'SELECT 1 FROM public."user" u JOIN public.role r ON r.id = u."roleId" WHERE r.name = $1 LIMIT 1',
    ['DIRECAO'],
  );
  if (existing.rowCount)
    throw new Error(
      'Já existe um diretor. Use o gerenciamento autenticado para criar outros.',
    );
  const nome = await rl.question('Nome do primeiro diretor: ');
  const email = await rl.question('E-mail: ');
  const senha = await password('Senha (12 a 128 caracteres): ');
  if (senha !== (await password('Confirme a senha: ')))
    throw new Error('As senhas não conferem.');
  const dto = plainToInstance(CreateUserDto, {
    nome,
    email,
    senha,
    role: 'DIRECAO',
  });
  const errors = await validate(dto);
  if (errors.length)
    throw new Error(
      `Dados inválidos: ${errors.map((e) => e.property).join(', ')}`,
    );
  const hash = await hashPassword(senha);
  await client.query('BEGIN');
  // Serialize concurrent provisioning attempts; this command only bootstraps once.
  await client.query('LOCK TABLE public."user" IN SHARE ROW EXCLUSIVE MODE');
  const check = await client.query(
    'SELECT 1 FROM public."user" u JOIN public.role r ON r.id = u."roleId" WHERE r.name = $1 LIMIT 1',
    ['DIRECAO'],
  );
  if (check.rowCount) throw new Error('Já existe um diretor.');
  const inserted = await client.query(
    'INSERT INTO public."user" (nome, email, "senhaHash", ativo, "roleId", "updatedAt") SELECT $1, $2, $3, true, id, now() FROM public.role WHERE name = $4 RETURNING id',
    [dto.nome, dto.email, hash, 'DIRECAO'],
  );
  if (!inserted.rowCount)
    throw new Error('Execute npm run db:seed antes de criar o diretor.');
  await client.query('COMMIT');
  console.log('Diretor criado. Você já pode fazer login.');
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  // Database errors can include row values; never print their details.
  console.error(
    error.code
      ? `Falha no banco (${error.code}). Verifique se o e-mail já existe e se o banco está inicializado.`
      : error.message,
  );
  process.exitCode = 1;
} finally {
  rl.close();
  await client.end();
}
