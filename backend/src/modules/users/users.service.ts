import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.module.js';
import { hashPassword } from '../auth/password.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { PageDto, offset } from '../../common/api.js';

const fields =
  'u.id, u.nome, u.email, u.ativo, u."roleId", r.name AS role, u."createdAt", u."updatedAt"';
@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}
  async findAll(page: PageDto = new PageDto()) {
    return (
      await this.db.query(
        'SELECT ' +
          fields +
          ' FROM public."user" u JOIN public.role r ON r.id = u."roleId" ORDER BY u.id LIMIT $1 OFFSET $2',
        [page.limit, offset(page)],
      )
    ).rows;
  }
  async findOne(id: number) {
    const {
      rows: [user],
    } = await this.db.query(
      'SELECT ' +
        fields +
        ' FROM public."user" u JOIN public.role r ON r.id = u."roleId" WHERE u.id = $1',
      [id],
    );
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }
  async create(dto: CreateUserDto) {
    const hash = await hashPassword(dto.senha);
    try {
      const {
        rows: [user],
      } = await this.db.query(
        'INSERT INTO public."user" (nome, email, "senhaHash", ativo, "roleId", "updatedAt") SELECT $1, $2, $3, true, id, now() FROM public.role WHERE name = $4 RETURNING id',
        [dto.nome.trim(), dto.email.trim().toLowerCase(), hash, dto.role],
      );
      if (!user) throw new BadRequestException('Perfil não encontrado');
      return this.findOne(user.id);
    } catch (error) {
      if ((error as { code?: string }).code === '23505')
        throw new ConflictException('E-mail já cadastrado');
      throw error;
    }
  }
  async update(id: number, dto: UpdateUserDto) {
    await this.db.transaction(async (c) => {
      // All administrative account changes share a transaction lock to protect the last active director.
      await c.query('SELECT pg_advisory_xact_lock(71824001)');
      const {
        rows: [user],
      } = await c.query(
        'SELECT u.*, r.name AS role FROM public."user" u JOIN public.role r ON r.id = u."roleId" WHERE u.id = $1 FOR UPDATE OF u',
        [id],
      );
      if (!user) throw new NotFoundException('Usuário não encontrado');
      if (
        user.ativo &&
        user.role === 'DIRECAO' &&
        (dto.ativo === false ||
          (dto.role !== undefined && dto.role !== 'DIRECAO'))
      ) {
        const {
          rows: [count],
        } = await c.query(
          'SELECT count(*)::int AS total FROM public."user" u JOIN public.role r ON r.id = u."roleId" WHERE u.ativo AND r.name = $1',
          ['DIRECAO'],
        );
        if (count.total <= 1)
          throw new ConflictException(
            'Não é permitido remover o último diretor ativo',
          );
      }
      const {
        rows: [role],
      } = await c.query('SELECT id FROM public.role WHERE name = $1', [
        dto.role ?? user.role,
      ]);
      if (!role) throw new BadRequestException('Perfil não encontrado');
      await c.query(
        'UPDATE public."user" SET nome=$1, email=$2, ativo=$3, "roleId"=$4, "updatedAt"=now() WHERE id=$5',
        [
          dto.nome ?? user.nome,
          dto.email ?? user.email,
          dto.ativo ?? user.ativo,
          role.id,
          id,
        ],
      );
      if (
        dto.ativo === false ||
        (dto.role !== undefined && dto.role !== user.role) ||
        (dto.email !== undefined && dto.email !== user.email)
      ) {
        await c.query('DELETE FROM public.session WHERE "userId"=$1', [id]);
        await c.query('DELETE FROM public."passwordReset" WHERE "userId"=$1', [
          id,
        ]);
      }
    });
    return this.findOne(id);
  }
}
