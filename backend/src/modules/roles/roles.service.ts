import { Injectable } from '@nestjs/common';

@Injectable()
export class RolesService {
  findAll() {
    return [
      { id: 1, name: 'ALUNO' },
      { id: 2, name: 'PROFESSOR' },
      { id: 3, name: 'SOE' },
      { id: 4, name: 'COORDENACAO' },
      { id: 5, name: 'DIRECAO' },
    ];
  }
}