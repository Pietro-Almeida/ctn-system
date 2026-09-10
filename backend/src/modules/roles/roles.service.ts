import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.module.js';
@Injectable()
export class RolesService {
  constructor(private readonly db: DatabaseService) {}
  async findAll() {
    return (
      await this.db.query(
        'SELECT id, name FROM public.role WHERE name = ANY($1::text[]) ORDER BY id',
        [['ALUNO', 'PROFESSOR', 'DIRECAO']],
      )
    ).rows;
  }
}
