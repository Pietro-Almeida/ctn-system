import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Pool } from 'pg';
import { AppModule } from '../src/app.module.js';
import { ApiExceptionFilter } from '../src/common/api.js';
import { hashPassword } from '../src/modules/auth/password.js';

const isolated = process.env.TEST_DATABASE_URL;
if (
  isolated &&
  (isolated !== process.env.DATABASE_URL ||
    !/^\/ctn_test_[a-f0-9]{16}$/.test(new URL(isolated).pathname))
) {
  throw new Error('Integration tests require an isolated generated database');
}
describe.skipIf(!isolated)('Backend completo / PostgreSQL real', () => {
  let app: INestApplication;
  let pool: Pool;
  let hash: string;
  let ids: Record<string, number>;
  let tokens: Record<string, string>;
  const senha = 'senha-de-teste-12345';
  const emails: Record<string, string> = {
    director: 'director@example.test',
    teacher: 'teacher@example.test',
    student: 'student@example.test',
    other: 'other@example.test',
  };
  async function start() {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.init();
  }
  const login = (who: string, password = senha) =>
    request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: emails[who], senha: password });
  function send(
    method: 'get' | 'post' | 'patch' | 'delete',
    path: string,
    who = 'director',
    body?: object,
  ) {
    const req = request(app.getHttpServer())[method](path);
    if (who) req.set('Authorization', 'Bearer ' + tokens[who]);
    if (body) req.send(body);
    return req;
  }
  const community = async () =>
    (
      await send('post', '/communities', 'teacher', {
        nome: 'Clube de ciências',
        descricao: 'Projetos',
        regras: 'Respeito',
      }).expect(201)
    ).body.id;
  beforeAll(async () => {
    pool = new Pool({ connectionString: isolated });
    hash = await hashPassword(senha);
  });
  beforeEach(async () => {
    await pool.query(
      'TRUNCATE public."user", public.role, public.community, public.news, public."loginAttempt" RESTART IDENTITY CASCADE',
    );
    ids = {};
    tokens = {};
    for (const role of ['DIRECAO', 'PROFESSOR', 'ALUNO'])
      await pool.query(
        'INSERT INTO public.role (name,"updatedAt") VALUES ($1,now())',
        [role],
      );
    for (const [who, role] of Object.entries({
      director: 'DIRECAO',
      teacher: 'PROFESSOR',
      student: 'ALUNO',
      other: 'ALUNO',
    })) {
      const result = await pool.query(
        'INSERT INTO public."user" (nome,email,"senhaHash","roleId","updatedAt") SELECT $1,$2,$3,id,now() FROM public.role WHERE name=$4 RETURNING id',
        [who, emails[who], hash, role],
      );
      ids[who] = result.rows[0].id;
    }
    await start();
    for (const who of Object.keys(emails))
      tokens[who] = (await login(who).expect(200)).body.access_token;
  });
  afterEach(async () => {
    await app?.close();
  });
  afterAll(async () => {
    await pool?.end();
  });

  it('informa prontidão com uma consulta real ao banco', async () => {
    const response = await send('get', '/health', '').expect(200);
    expect(response.body).toEqual({ status: 'ok', database: 'up' });
  });

  it('exige autenticação e aplica perfis de gestão', async () => {
    for (const path of [
      '/users',
      '/roles',
      '/news',
      '/communities',
      '/auth/me',
    ])
      await send('get', path, '').expect(401);
    for (const who of ['teacher', 'student']) {
      await send('get', '/users', who).expect(403);
      await send('post', '/users', who, {}).expect(403);
      await send('get', '/roles', who).expect(403);
    }
    const users = await send('get', '/users').expect(200);
    expect(users.body).toHaveLength(4);
    expect(JSON.stringify(users.body)).not.toMatch(/senhaHash|tokenHash/);
    expect((await send('get', '/roles').expect(200)).body).toHaveLength(3);
  });
  it('persiste sessões entre reinícios e revoga no logout', async () => {
    await app.close();
    await start();
    await send('get', '/auth/me', 'student').expect(200);
    await send('post', '/auth/logout', 'student').expect(204);
    await send('get', '/auth/me', 'student').expect(401);
    const stored = await pool.query('SELECT "tokenHash" FROM public.session');
    expect(stored.rows.some((r) => r.tokenHash === tokens.director)).toBe(
      false,
    );
  });
  it('rejeita senha errada, conta desconhecida, inativa, hash legado e token adulterado', async () => {
    await login('student', 'errada').expect(401);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'missing@example.test', senha })
      .expect(401);
    await pool.query('UPDATE public."user" SET ativo=false WHERE id=$1', [
      ids.student,
    ]);
    await login('student').expect(401);
    await send('get', '/auth/me', 'student').expect(401);
    await pool.query('UPDATE public."user" SET "senhaHash"=$1 WHERE id=$2', [
      'TEMPORARIO',
      ids.teacher,
    ]);
    await login('teacher').expect(401);
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', 'Bearer ' + 'x'.repeat(43))
      .expect(401);
  });
  it('expira sessões e limita tentativas persistentemente', async () => {
    await pool.query(
      'UPDATE public.session SET "expiresAt"=now()-interval \'1 second\'',
    );
    await send('get', '/auth/me').expect(401);
    await pool.query('DELETE FROM public."loginAttempt"');
    for (let i = 0; i < 10; i++) await login('student', 'errada').expect(401);
    await app.close();
    await start();
    await login('student').expect(429);
  });
  it('valida os corpos e paginação', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: emails.director, senha, role: 'DIRECAO' })
      .expect(400);
    await send('post', '/users', 'director', {
      nome: ' ',
      email: 'invalid',
      senha: 'short',
      role: 'ALUNO',
    }).expect(400);
    await send('post', '/users', 'director', {
      nome: 'Teste',
      email: 'a@example.test',
      senha,
      role: 'SOE',
    }).expect(400);
    await send('patch', '/users/' + ids.student, 'director', {
      ativo: null,
    }).expect(400);
    await send('get', '/users?page=0').expect(400);
    await send('get', '/news?limit=101').expect(400);
    await send('get', '/communities/not-an-id').expect(400);
    expect((await send('get', '/users?limit=2&page=2')).body).toHaveLength(2);
  });
  it('cadastra, edita, desativa e reativa usuários sem expor senhas', async () => {
    const created = await send('post', '/users', 'director', {
      nome: ' Nova pessoa ',
      email: 'NEW@EXAMPLE.TEST',
      senha,
      role: 'ALUNO',
    }).expect(201);
    expect(created.body.nome).toBe('Nova pessoa');
    expect(created.body.email).toBe('new@example.test');
    expect(created.body).not.toHaveProperty('senhaHash');
    await send('patch', '/users/' + created.body.id, 'director', {
      nome: 'Nome novo',
    }).expect(200);
    await send('patch', '/users/' + ids.student, 'director', {
      ativo: false,
    }).expect(200);
    await send('get', '/auth/me', 'student').expect(401);
    await login('student').expect(401);
    await send('patch', '/users/' + ids.student, 'director', {
      ativo: true,
    }).expect(200);
    await login('student').expect(200);
    await send('get', '/users/99999').expect(404);
  });
  it('retorna 409 para cadastros concorrentes com mesmo e-mail', async () => {
    const body = {
      nome: 'Duplicado',
      email: 'duplicate@example.test',
      senha,
      role: 'ALUNO',
    };
    const results = await Promise.all([
      send('post', '/users', 'director', body),
      send('post', '/users', 'director', body),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(JSON.stringify(results.map((r) => r.body))).not.toContain('scrypt$');
  });
  it('preserva o último diretor ativo e serializa desativações concorrentes', async () => {
    await send('patch', '/users/' + ids.director, 'director', {
      ativo: false,
    }).expect(409);
    await send('patch', '/users/' + ids.director, 'director', {
      role: 'ALUNO',
    }).expect(409);
    const second = await send('post', '/users', 'director', {
      nome: 'Diretor 2',
      email: 'd2@example.test',
      senha,
      role: 'DIRECAO',
    }).expect(201);
    const result = await Promise.all([
      send('patch', '/users/' + ids.director, 'director', { ativo: false }),
      send('patch', '/users/' + second.body.id, 'director', { ativo: false }),
    ]);
    expect(result.filter((r) => r.status === 200)).toHaveLength(1);
    const {
      rows: [remaining],
    } = await pool.query(
      'SELECT count(*)::int AS n FROM public."user" u JOIN public.role r ON r.id=u."roleId" WHERE u.ativo AND r.name=$1',
      ['DIRECAO'],
    );
    expect(remaining.n).toBe(1);
  });
  it('troca senha e invalida todas as sessões antigas', async () => {
    await send('post', '/auth/change-password', 'student', {
      senhaAtual: 'errada',
      novaSenha: 'nova-senha-12345',
    }).expect(401);
    await send('post', '/auth/change-password', 'student', {
      senhaAtual: senha,
      novaSenha: 'nova-senha-12345',
    }).expect(204);
    await send('get', '/auth/me', 'student').expect(401);
    await login('student').expect(401);
    await login('student', 'nova-senha-12345').expect(200);
  });
  it('recupera senha com código único, invalida o código anterior e revoga sessões', async () => {
    await send(
      'post',
      '/users/' + ids.student + '/password-reset',
      'teacher',
    ).expect(403);
    const old = (
      await send('post', '/users/' + ids.student + '/password-reset').expect(
        201,
      )
    ).body.token;
    const token = (
      await send('post', '/users/' + ids.student + '/password-reset').expect(
        201,
      )
    ).body.token;
    await send('post', '/auth/reset-password', '', {
      token: old,
      novaSenha: 'nova-senha-12345',
    }).expect(400);
    await send('post', '/auth/reset-password', '', {
      token,
      novaSenha: 'nova-senha-12345',
    }).expect(204);
    await send('post', '/auth/reset-password', '', {
      token,
      novaSenha: 'nova-senha-12345',
    }).expect(400);
    await send('get', '/auth/me', 'student').expect(401);
    await login('student', 'nova-senha-12345').expect(200);
  });
  it('rejeita código expirado e permite somente um consumo concorrente', async () => {
    const expired = (
      await send('post', '/users/' + ids.student + '/password-reset')
    ).body.token;
    await pool.query(
      'UPDATE public."passwordReset" SET "expiresAt"=now()-interval \'1 second\'',
    );
    await send('post', '/auth/reset-password', '', {
      token: expired,
      novaSenha: 'nova-senha-12345',
    }).expect(400);
    const token = (
      await send('post', '/users/' + ids.student + '/password-reset')
    ).body.token;
    const results = await Promise.all([
      send('post', '/auth/reset-password', '', {
        token,
        novaSenha: 'nova-senha-12345',
      }),
      send('post', '/auth/reset-password', '', {
        token,
        novaSenha: 'nova-senha-12345',
      }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([204, 400]);
  });
  it('Jornal: todos leem, professores publicam, apenas autor ou direção alteram', async () => {
    const body = {
      titulo: 'Aviso',
      conteudo: 'Texto do aviso',
      categoria: 'AVISO',
    };
    await send('post', '/news', 'student', body).expect(403);
    const news = (await send('post', '/news', 'teacher', body).expect(201))
      .body;
    await send('get', '/news/' + news.id, 'student').expect(200);
    expect((await send('get', '/news', 'student')).body).toHaveLength(1);
    await pool.query(
      'UPDATE public."user" SET "roleId"=(SELECT id FROM public.role WHERE name=$1) WHERE id=$2',
      ['PROFESSOR', ids.other],
    );
    await send('patch', '/news/' + news.id, 'other', {
      titulo: 'Não permitido',
    }).expect(403);
    await send('delete', '/news/' + news.id, 'other').expect(403);
    await send('patch', '/news/' + news.id, 'teacher', {
      titulo: 'Atualizado',
    }).expect(200);
    await send('delete', '/news/' + news.id, 'director').expect(204);
    await send('get', '/news/' + news.id).expect(404);
  });
  it('Comunidades: criação, participação idempotente, conteúdo reservado aos membros', async () => {
    await send('post', '/communities', 'student', {
      nome: 'Grupo',
      descricao: 'Descrição',
    }).expect(403);
    const id = await community();
    await send('get', '/communities/' + id, 'student').expect(200);
    await send('get', '/communities/' + id + '/posts', 'student').expect(403);
    await send('post', '/communities/' + id + '/posts', 'student', {
      conteudo: 'Oi',
    }).expect(403);
    await send('post', '/communities/' + id + '/members/me', 'student').expect(
      204,
    );
    await send('post', '/communities/' + id + '/members/me', 'student').expect(
      204,
    );
    const members = (
      await send('get', '/communities/' + id + '/members', 'student')
    ).body;
    expect(members).toHaveLength(2);
    expect(JSON.stringify(members)).not.toContain('email');
    await send('post', '/communities/' + id + '/posts', 'student', {
      conteudo: 'Oi',
    }).expect(201);
    await send(
      'delete',
      '/communities/' + id + '/members/me',
      'teacher',
    ).expect(409);
    await send(
      'delete',
      '/communities/' + id + '/members/me',
      'student',
    ).expect(204);
    await send('get', '/communities/' + id + '/posts', 'student').expect(403);
  });
  it('Comunidades: comentários, autoria, moderação e proteção entre comunidades', async () => {
    const id = await community();
    const second = await community();
    for (const who of ['student', 'other'])
      await send('post', '/communities/' + id + '/members/me', who).expect(204);
    const post = (
      await send('post', '/communities/' + id + '/posts', 'student', {
        conteudo: 'Conteúdo',
      })
    ).body;
    const comment = (
      await send(
        'post',
        `/communities/${id}/posts/${post.id}/comments`,
        'other',
        { conteudo: 'Comentário' },
      ).expect(201)
    ).body;
    await send('patch', `/communities/${id}/posts/${post.id}`, 'other', {
      conteudo: 'Tentativa',
    }).expect(403);
    await send(
      'patch',
      `/communities/${id}/posts/${post.id}/comments/${comment.id}`,
      'student',
      { conteudo: 'Tentativa' },
    ).expect(403);
    await send(
      'patch',
      `/communities/${id}/posts/${post.id}/comments/${comment.id}`,
      'other',
      { conteudo: 'Editado' },
    ).expect(200);
    await send(
      'post',
      `/communities/${second}/posts/${post.id}/comments`,
      'teacher',
      { conteudo: 'Outro grupo' },
    ).expect(404);
    await send(
      'get',
      `/communities/${id}/posts/${post.id}/comments`,
      'student',
    ).expect(200);
    await send(
      'delete',
      `/communities/${id}/posts/${post.id}/comments/${comment.id}`,
      'teacher',
    ).expect(204);
    await send(
      'delete',
      `/communities/${id}/posts/${post.id}`,
      'teacher',
    ).expect(204);
    await send(
      'delete',
      `/communities/${id}/members/${ids.other}`,
      'teacher',
    ).expect(204);
    await send('get', `/communities/${id}/posts`, 'other').expect(403);
    await send('patch', '/communities/' + id, 'student', {
      nome: 'Não permitido',
    }).expect(403);
    await send('patch', '/communities/' + id, 'teacher', {
      nome: 'Novo nome',
    }).expect(200);
  });
  it('exclui comunidade e conteúdos relacionados em uma transação', async () => {
    const id = await community();
    const post = (
      await send('post', '/communities/' + id + '/posts', 'teacher', {
        conteudo: 'Conteúdo',
      })
    ).body;
    await send(
      'post',
      `/communities/${id}/posts/${post.id}/comments`,
      'teacher',
      { conteudo: 'Comentário' },
    ).expect(201);
    await send('delete', '/communities/' + id, 'student').expect(403);
    await send('delete', '/communities/' + id, 'director').expect(204);
    await send('get', '/communities/' + id).expect(404);
    for (const table of ['comment', 'communityPost', 'membership'])
      expect(
        (
          await pool.query(
            'SELECT count(*)::int AS n FROM public."' + table + '"',
          )
        ).rows[0].n,
      ).toBe(0);
  });
});
