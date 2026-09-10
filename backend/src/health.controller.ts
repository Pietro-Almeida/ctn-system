import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from './database/database.module.js';
import { Public } from './modules/auth/auth.metadata.js';

@Controller('health')
export class HealthController {
  constructor(private readonly db: DatabaseService) {}
  @Public()
  @Get()
  async health() {
    try {
      await this.db.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException('Banco indisponível');
    }
    return { status: 'ok', database: 'up' };
  }
}
