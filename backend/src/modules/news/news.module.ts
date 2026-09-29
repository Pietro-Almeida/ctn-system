import {
  Module,
  Injectable,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  ParseIntPipe,
  Body,
  Query,
  Req,
  HttpCode,
  NotFoundException,
  ForbiddenException,
  Res,
} from '@nestjs/common';
import {
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
  Matches,
  ValidateIf,
  IsOptional,
  IsInt,
  Min,
} from 'class-validator';
import { DatabaseService } from '../../database/database.module.js';
import { PageDto, offset, Trim } from '../../common/api.js';
import { RequireRoles } from '../auth/auth.metadata.js';
import type { AuthRequest, AuthUser } from '../auth/auth.metadata.js';
import { Role } from '../roles/role.enum.js';
import { Type } from 'class-transformer';
import type { Response } from 'express';
import { storeCover, readCover } from './news-covers.js';

export class NewsQueryDto extends PageDto {
  @IsOptional() @IsString() @Trim() @MaxLength(200) q?: string;
  @IsOptional() @IsString() @MaxLength(200) categories?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) authorId?: number;
}

const coverField = `CASE WHEN n.capa IS NULL THEN NULL ELSE '/news/' || n.id || '/cover?v=' || extract(epoch from n."updatedAt")::text END AS capa`;
const summaryFields = `n.id, n.titulo, left(regexp_replace(n.conteudo, '<[^>]*>', '', 'g'), 240) AS conteudo, n.categoria, n."authorId", n."createdAt", n."updatedAt", u.nome AS "authorName", ${coverField}`;
const normalizedSql = (field: string) => `translate(lower(${field}), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc')`;

const categories = [
  'AVISO',
  'EVENTO',
  'INFORMACAO',
  'PROJETO',
  'COMUNICADO',
  'NOTICIA',
  'ATIVIDADE',
  'ESPORTES',
  'CIENCIAS',
  'CULTURA',
  'EDUCACAO',
];
export class CreateNewsDto {
  @IsString() @Trim() @IsNotEmpty() @MaxLength(200) titulo: string;
  @IsString() @Trim() @IsNotEmpty() @MaxLength(20000) conteudo: string;
  @IsIn(categories) categoria: string;
  @ValidateIf((_o, v) => v !== undefined)
  @IsString()
  @MaxLength(1500000)
  @Matches(/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/)
  capa?: string;
}
export class UpdateNewsDto {
  @ValidateIf((_o, v) => v !== undefined)
  @IsString()
  @Trim()
  @IsNotEmpty()
  @MaxLength(200)
  titulo?: string;
  @ValidateIf((_o, v) => v !== undefined)
  @IsString()
  @Trim()
  @IsNotEmpty()
  @MaxLength(20000)
  conteudo?: string;
  @ValidateIf((_o, v) => v !== undefined) @IsIn(categories) categoria?: string;
  @ValidateIf((_o, v) => v !== undefined)
  @IsString()
  @MaxLength(1500000)
  @Matches(/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/)
  capa?: string;
}
@Injectable()
export class NewsService {
  constructor(private readonly db: DatabaseService) {}
  async stats() {
    const { rows: [stats] } = await this.db.query(`SELECT
      count(*) FILTER (WHERE "createdAt" >= now() - interval '7 days')::int AS recent,
      count(*) FILTER (WHERE "createdAt" >= now() - interval '7 days' AND categoria IN ('AVISO', 'COMUNICADO'))::int AS important
      FROM public.news`);
    return stats;
  }
  async search(page: NewsQueryDto) {
    const where = `($1 = '' OR strpos(${normalizedSql("n.titulo || ' ' || regexp_replace(n.conteudo, '<[^>]*>', ' ', 'g')")}, $1) > 0)
      AND ($2::text[] IS NULL OR n.categoria = ANY($2)) AND ($3::int IS NULL OR n."authorId" = $3)`;
    const parameters = [page.q?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim() ?? '', page.categories ? page.categories.split(',') : null, page.authorId ?? null];
    const [items, count] = await Promise.all([
      this.db.query(`SELECT ${summaryFields} FROM public.news n JOIN public."user" u ON u.id=n."authorId" WHERE ${where} ORDER BY n."createdAt" DESC, n.id DESC LIMIT $4 OFFSET $5`, [...parameters, page.limit, offset(page)]),
      this.db.query(`SELECT count(*)::int AS total FROM public.news n WHERE ${where}`, parameters),
    ]);
    return { items: items.rows, total: count.rows[0].total, page: page.page, limit: page.limit };
  }

  async cover(id: number) {
    const { rows: [news] } = await this.db.query('SELECT capa FROM public.news WHERE id=$1', [id]);
    if (!news?.capa) throw new NotFoundException('Capa não encontrada');
    let reference = news.capa as string;
    if (reference.startsWith('data:')) {
      const stored = await storeCover(reference);
      await this.db.query('UPDATE public.news SET capa=$1 WHERE id=$2 AND capa=$3', [stored, id, reference]);
      reference = stored;
    }
    return readCover(reference);
  }
  async list(page: PageDto) {
    return (
      await this.db.query(
        `SELECT ${summaryFields} FROM public.news n JOIN public."user" u ON u.id=n."authorId" ORDER BY n."createdAt" DESC, n.id DESC LIMIT $1 OFFSET $2`,
        [page.limit, offset(page)],
      )
    ).rows;
  }
  async get(id: number) {
    const {
      rows: [news],
    } = await this.db.query(
      `SELECT n.id, n.titulo, n.conteudo, n.categoria, n."authorId", n."createdAt", n."updatedAt", u.nome AS "authorName", ${coverField} FROM public.news n JOIN public."user" u ON u.id=n."authorId" WHERE n.id=$1`,
      [id],
    );
    if (!news) throw new NotFoundException('Publicação não encontrada');
    return news;
  }
  async create(dto: CreateNewsDto, user: AuthUser) {
    const cover = dto.capa ? await storeCover(dto.capa) : null;
    const created = (
      await this.db.query(
        'INSERT INTO public.news (titulo, conteudo, categoria, capa, "authorId", "updatedAt") VALUES ($1,$2,$3,$4,$5,now()) RETURNING id',
        [dto.titulo, dto.conteudo, dto.categoria, cover, user.id],
      )
    ).rows[0];
    return this.get(created.id);
  }
  async update(id: number, dto: UpdateNewsDto, user: AuthUser) {
    const news = await this.get(id);
    if (news.authorId !== user.id && user.role !== Role.DIRECAO)
      throw new ForbiddenException('Apenas o autor ou a direção pode editar');
    const cover = dto.capa ? await storeCover(dto.capa) : null;
    const {
      rows: [updated],
    } = await this.db.query(
      'UPDATE public.news SET titulo=COALESCE($1,titulo), conteudo=COALESCE($2,conteudo), categoria=COALESCE($3,categoria), capa=COALESCE($4,capa), "updatedAt"=now() WHERE id=$5 RETURNING *',
      [dto.titulo, dto.conteudo, dto.categoria, cover, id],
    );
    if (!updated) throw new NotFoundException('Publicação não encontrada');
    return this.get(id);
  }
  async remove(id: number, user: AuthUser) {
    const news = await this.get(id);
    if (news.authorId !== user.id && user.role !== Role.DIRECAO)
      throw new ForbiddenException('Apenas o autor ou a direção pode excluir');
    await this.db.query('DELETE FROM public.news WHERE id=$1', [id]);
  }
}
@Controller('news')
export class NewsController {
  constructor(private readonly service: NewsService) {}
  @Get('stats') stats() { return this.service.stats(); }
  @Get('search') search(@Query() query: NewsQueryDto) {
    return this.service.search(query);
  }
  @Get(':id/cover') async cover(@Param('id', ParseIntPipe) id: number, @Res() response: Response) {
    const cover = await this.service.cover(id);
    response.setHeader('Cache-Control', 'private, max-age=300');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.type(cover.mime).send(cover.bytes);
  }
  @Get() list(@Query() page: PageDto) {
    return this.service.list(page);
  }
  @Get(':id') get(@Param('id', ParseIntPipe) id: number) {
    return this.service.get(id);
  }
  @Post()
  @RequireRoles(Role.DIRECAO, Role.PROFESSOR)
  create(@Body() dto: CreateNewsDto, @Req() req: AuthRequest) {
    return this.service.create(dto, req.user);
  }
  @Patch(':id')
  @RequireRoles(Role.DIRECAO, Role.PROFESSOR)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateNewsDto,
    @Req() req: AuthRequest,
  ) {
    return this.service.update(id, dto, req.user);
  }
  @Delete(':id')
  @HttpCode(204)
  @RequireRoles(Role.DIRECAO, Role.PROFESSOR)
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.service.remove(id, req.user);
  }
}
@Module({ controllers: [NewsController], providers: [NewsService] })
export class NewsModule {}
