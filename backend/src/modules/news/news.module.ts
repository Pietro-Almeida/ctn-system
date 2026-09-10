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
} from '@nestjs/common';
import {
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { DatabaseService } from '../../database/database.module.js';
import { PageDto, offset, Trim } from '../../common/api.js';
import { RequireRoles } from '../auth/auth.metadata.js';
import type { AuthRequest, AuthUser } from '../auth/auth.metadata.js';
import { Role } from '../roles/role.enum.js';

const categories = [
  'AVISO',
  'EVENTO',
  'INFORMACAO',
  'PROJETO',
  'COMUNICADO',
  'NOTICIA',
  'ATIVIDADE',
];
export class CreateNewsDto {
  @IsString() @Trim() @IsNotEmpty() @MaxLength(200) titulo: string;
  @IsString() @Trim() @IsNotEmpty() @MaxLength(20000) conteudo: string;
  @IsIn(categories) categoria: string;
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
}
@Injectable()
export class NewsService {
  constructor(private readonly db: DatabaseService) {}
  async list(page: PageDto) {
    return (
      await this.db.query(
        'SELECT n.*, u.nome AS "authorName" FROM public.news n JOIN public."user" u ON u.id=n."authorId" ORDER BY n."createdAt" DESC, n.id DESC LIMIT $1 OFFSET $2',
        [page.limit, offset(page)],
      )
    ).rows;
  }
  async get(id: number) {
    const {
      rows: [news],
    } = await this.db.query(
      'SELECT n.*, u.nome AS "authorName" FROM public.news n JOIN public."user" u ON u.id=n."authorId" WHERE n.id=$1',
      [id],
    );
    if (!news) throw new NotFoundException('Publicação não encontrada');
    return news;
  }
  async create(dto: CreateNewsDto, user: AuthUser) {
    return (
      await this.db.query(
        'INSERT INTO public.news (titulo, conteudo, categoria, "authorId", "updatedAt") VALUES ($1,$2,$3,$4,now()) RETURNING *',
        [dto.titulo, dto.conteudo, dto.categoria, user.id],
      )
    ).rows[0];
  }
  async update(id: number, dto: UpdateNewsDto, user: AuthUser) {
    const news = await this.get(id);
    if (news.authorId !== user.id && user.role !== Role.DIRECAO)
      throw new ForbiddenException('Apenas o autor ou a direção pode editar');
    const {
      rows: [updated],
    } = await this.db.query(
      'UPDATE public.news SET titulo=COALESCE($1,titulo), conteudo=COALESCE($2,conteudo), categoria=COALESCE($3,categoria), "updatedAt"=now() WHERE id=$4 RETURNING *',
      [dto.titulo, dto.conteudo, dto.categoria, id],
    );
    if (!updated) throw new NotFoundException('Publicação não encontrada');
    return updated;
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
