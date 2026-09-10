import { Controller, Get } from '@nestjs/common';
import { RolesService } from './roles.service.js';
import { RequireRoles } from '../auth/auth.metadata.js';
import { Role } from './role.enum.js';

@Controller('roles')
@RequireRoles(Role.DIRECAO)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  findAll() {
    return this.rolesService.findAll();
  }
}
