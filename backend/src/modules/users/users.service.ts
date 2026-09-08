import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.client.orm.public.User.all();
  }

  async findOne(id: number) {
    return this.prisma.client.orm.public.User.first({ id });
  }

  async create(createUserDto: CreateUserDto) {
    const role = await this.prisma.client.orm.public.Role.first({
      name: createUserDto.role,
    });

    if (!role) {
      throw new Error('Perfil não encontrado');
    }

    return this.prisma.client.orm.public.User.create({
      nome: createUserDto.nome,
      email: createUserDto.email,
      senhaHash: 'TEMPORARIO',
      ativo: true,
      roleId: role.id,
    });
  }
}