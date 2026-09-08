import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto.js';

@Injectable()
export class UsersService {
  private readonly users = [
    {
      id: 1,
      nome: 'Aluno Exemplo',
      email: 'aluno@exemplo.com',
      role: 'ALUNO',
    },
    {
      id: 2,
      nome: 'Professor Exemplo',
      email: 'professor@exemplo.com',
      role: 'PROFESSOR',
    },
  ];

  findAll() {
    return this.users;
  }

  findOne(id: number) {
    return this.users.find((user) => user.id === id);
  }

  create(createUserDto: CreateUserDto) {
    const newUser = {
      id: this.users.length + 1,
      ...createUserDto,
    };

    this.users.push(newUser);

    return newUser;
  }
}