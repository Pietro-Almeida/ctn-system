import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module.js';
import { ApiExceptionFilter } from './common/api.js';
import { DatabaseService } from './database/database.module.js';
import { hashPassword } from './modules/auth/password.js';

async function ensureInitialDirector(app: any) {
  const password = process.env.BOOTSTRAP_DIRECTOR_PASSWORD;

  if (!password) {
    return;
  }

  const db = app.get(DatabaseService);
  const cpf = '52998224725';

  const { rows } = await db.query(
    `SELECT u.id
     FROM public."user" u
     JOIN public.role r ON r.id = u."roleId"
     WHERE u.cpf = $1 OR r.name = 'DIRECAO'
     LIMIT 1`,
    [cpf],
  );

  if (rows.length > 0) {
    return;
  }

  const senhaHash = await hashPassword(password);

  await db.query(
    `INSERT INTO public."user"
      (nome, email, cpf, "senhaHash", ativo, "statusCadastro", "roleId", "updatedAt")
     SELECT $1, NULL, $2, $3, true, 'ATIVO', id, now()
     FROM public.role
     WHERE name = 'DIRECAO'`,
    ['Andre', cpf, senhaHash],
  );

  console.log('Diretor inicial criado com sucesso.');
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  app.use(json({ limit: '2mb' }));
  app.use(urlencoded({ extended: true, limit: '2mb' }));
  app.enableShutdownHooks();

  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
      .split(',')
      .map((origin) => origin.trim()),
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.useGlobalFilters(new ApiExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await ensureInitialDirector(app);

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
