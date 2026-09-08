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
    return {
      message: 'Criação de usuário será implementada na próxima etapa',
      data: createUserDto,
    };
  }
}