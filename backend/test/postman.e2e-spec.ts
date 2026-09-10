import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { Pool } from 'pg';
import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { ApiExceptionFilter } from '../src/common/api.js';
import { hashPassword } from '../src/modules/auth/password.js';

type CollectionItem = {
  name: string;
  request: { method: string; url: string; header: {key: string; value: string}[]; body?: {raw: string} };
  event: {listen: string; script: {exec: string[]}}[];
};
const collection = JSON.parse(readFileSync(new URL('../docs/ctn-validation.postman_collection.json', import.meta.url), 'utf8')) as {
  item: {name: string; item: CollectionItem[]}[];
};
const isolated = process.env.TEST_DATABASE_URL;
if (isolated && (isolated !== process.env.DATABASE_URL || !/^\/ctn_test_[a-f0-9]{16}$/.test(new URL(isolated).pathname))) {
  throw new Error('A coleção só pode ser executada automaticamente em banco isolado');
}

describe.skipIf(!isolated)('Coleção Postman / cenário da feira de ciências', () => {
  let app: INestApplication;
  let pool: Pool;
  const variables = new Map<string, unknown>();
  beforeAll(async () => {
    pool = new Pool({connectionString: isolated});
    // Include quotes and backslashes to test JSON escaping of real passwords.
    const password = 'Validacao-"segura"-\\123';
    variables.set('base_url', 'http://localhost:3000');
    variables.set('director_email', 'validation.director@example.test');
    variables.set('director_password', password);
    for (const role of ['DIRECAO', 'PROFESSOR', 'ALUNO']) {
      await pool.query('INSERT INTO public.role (name,"updatedAt") VALUES ($1,now()) ON CONFLICT (name) DO NOTHING', [role]);
    }
    await pool.query('INSERT INTO public."user" (nome,email,"senhaHash","roleId","updatedAt") SELECT $1,$2,$3,id,now() FROM public.role WHERE name=$4', [
      'Direção de validação', variables.get('director_email'), await hashPassword(password), 'DIRECAO',
    ]);
    const module = await Test.createTestingModule({imports: [AppModule]}).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}));
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.init();
  });
  afterAll(async () => { await app?.close(); await pool?.end(); });

  it('reproduz as requisições e executa as asserções da coleção em ordem', async () => {
    const replace = (text: string) => text.replace(/{{([^}]+)}}/g, (_match, key) => {
      if (!variables.has(key)) throw new Error('Variável ausente: ' + key);
      return String(variables.get(key));
    });
    let assertions = 0;
    let requests = 0;
    for (const folder of collection.item) for (const item of folder.item) {
      const pm: Record<string, unknown> = {
        variables: {get: (key: string) => variables.get(key), set: (key: string, value: unknown) => variables.set(key, value)},
        test: (name: string, assertion: () => void) => {
          try { assertion(); assertions++; }
          catch { throw new Error(`${item.name}: ${name} falhou`); }
        },
      };
      const scripts = (listen: string) => {
        for (const event of item.event.filter(e => e.listen === listen)) {
          // Execute only the small pm API subset used by this repository's collection.
          runInNewContext(event.script.exec.join('\n'), {pm}, {timeout: 1000});
        }
      };
      scripts('prerequest');
      const url = new URL(replace(item.request.url));
      const method = item.request.method.toLowerCase() as 'get'|'post'|'patch'|'delete';
      const req = request(app.getHttpServer())[method](url.pathname + url.search);
      for (const header of item.request.header) req.set(header.key, replace(header.value));
      if (item.request.body) req.send(JSON.parse(replace(item.request.body.raw)));
      const response = await req;
      pm.response = {
        code: response.status,
        json: () => response.body,
        to: {have: {status: (expected: number) => expect(response.status).toBe(expected)}},
      };
      scripts('test');
      requests++;
    }
    expect(requests).toBe(38);
    expect(assertions).toBeGreaterThanOrEqual(requests);
    const accounts = await pool.query('SELECT ativo FROM public."user" WHERE id = ANY($1::int[])', [[variables.get('teacher_id'), variables.get('student_id')]]);
    expect(accounts.rows).toEqual([{ativo:false},{ativo:false}]);
    const original = await pool.query('SELECT ativo FROM public."user" WHERE email=$1', [variables.get('director_email')]);
    expect(original.rows[0].ativo).toBe(true);
    expect((await pool.query('SELECT 1 FROM public.community WHERE id=$1', [variables.get('community_id')])).rowCount).toBe(0);
    expect((await pool.query('SELECT 1 FROM public.news WHERE id=$1', [variables.get('news_id')])).rowCount).toBe(0);
  }, 30000);
});
