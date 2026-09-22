import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('Configure DATABASE_URL em backend/.env antes de executar a migração.');
  process.exit(1);
}

const client = new Client({ connectionString: process.env.DATABASE_URL });
try {
  await client.connect();
  await client.query('BEGIN');
  await client.query('ALTER TABLE public."user" ALTER COLUMN email DROP NOT NULL');
  await client.query('ALTER TABLE public."user" ADD COLUMN IF NOT EXISTS cpf text');
  await client.query('ALTER TABLE public."user" ADD COLUMN IF NOT EXISTS "statusCadastro" text');
  await client.query(`UPDATE public."user" SET "statusCadastro" = CASE WHEN ativo THEN 'ATIVO' ELSE 'DESATIVADO' END WHERE "statusCadastro" IS NULL`);
  await client.query(`ALTER TABLE public."user" ALTER COLUMN "statusCadastro" SET DEFAULT 'ATIVO'`);
  await client.query('ALTER TABLE public."user" ALTER COLUMN "statusCadastro" SET NOT NULL');
  await client.query(`ALTER TABLE public."user" DROP CONSTRAINT IF EXISTS user_status_cadastro_check`);
  await client.query(`ALTER TABLE public."user" DROP CONSTRAINT IF EXISTS user_statusCadastro_check`);
  await client.query(`ALTER TABLE public."user" DROP CONSTRAINT IF EXISTS user_statusCadastro_check_01234567`);
  await client.query(`ALTER TABLE public."user" ADD CONSTRAINT user_statusCadastro_check_01234567 CHECK ("statusCadastro" IN ('PENDENTE','ATIVO','RECUSADO','DESATIVADO'))`);
  await client.query('CREATE UNIQUE INDEX IF NOT EXISTS user_cpf_unique ON public."user" (cpf) WHERE cpf IS NOT NULL');
  await client.query('COMMIT');
  console.log('Migração de CPF e aprovação de alunos concluída.');
} catch (error) {
  await client.query('ROLLBACK').catch(() => undefined);
  console.error('Falha na migração:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.end();
}
