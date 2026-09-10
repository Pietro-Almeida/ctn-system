import { config } from 'dotenv';
import { randomBytes } from 'node:crypto';
import { Client } from 'pg';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
config({ path: new URL('../.env', import.meta.url), quiet: true });
const cwd = fileURLToPath(new URL('../', import.meta.url));
const databaseName = 'ctn_test_' + randomBytes(8).toString('hex');
if (!/^ctn_test_[a-f0-9]{16}$/.test(databaseName))
  throw new Error('Invalid test database name');
if (!process.env.DATABASE_URL) throw new Error('Configure DATABASE_URL');
const adminUrl = new URL(process.env.DATABASE_URL);
adminUrl.pathname = '/postgres';
const client = new Client({
  connectionString: adminUrl.href,
  connectionTimeoutMillis: 5000,
});
const testUrl = new URL(adminUrl);
testUrl.pathname = '/' + databaseName;
const env = {
  ...process.env,
  DATABASE_URL: testUrl.href,
  TEST_DATABASE_URL: testUrl.href,
  DO_NOT_TRACK: '1',
};
let created = false;
try {
  await client.connect();
  await client.query('CREATE DATABASE "' + databaseName + '"');
  created = true;
  const init = spawnSync(
    process.execPath,
    ['node_modules/prisma/dist/prisma.js', 'db', 'init'],
    { cwd, env, encoding: 'utf8', timeout: 60000 },
  );
  if (init.status !== 0)
    throw new Error('Falha ao inicializar contrato no banco de teste');
  console.log('Banco isolado criado e contrato aplicado.');
  const test = spawnSync(
    process.execPath,
    [
      'node_modules/vitest/vitest.mjs',
      'run',
      '--config',
      'vitest.config.e2e.ts',
    ],
    { cwd, env, stdio: 'inherit', timeout: 120000 },
  );
  process.exitCode = test.status === 0 ? 0 : 1;
} catch (error) {
  console.error('Falha na integração:', error.code ?? error.message);
  process.exitCode = 1;
} finally {
  if (created) {
    await client.query('DROP DATABASE "' + databaseName + '" WITH (FORCE)');
    console.log('Banco temporário de teste removido.');
  }
  await client.end();
}
