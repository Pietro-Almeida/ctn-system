import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from './auth.service.js';
import type { AuthRequest } from './auth.metadata.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}
  async canActivate(context: ExecutionContext) {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>('auth:public', targets))
      return true;
    const req = context.switchToHttp().getRequest<AuthRequest>();
    const match = /^Bearer ([A-Za-z0-9_-]{43})$/i.exec(
      req.headers.authorization ?? '',
    );
    if (!match)
      throw new UnauthorizedException('Informe um token Bearer válido');
    req.token = match[1];
    req.user = await this.auth.authenticate(req.token);
    const roles = this.reflector.getAllAndOverride<string[]>(
      'auth:roles',
      targets,
    );
    if (roles && !roles.includes(req.user.role))
      throw new ForbiddenException('Perfil sem permissão');
    return true;
  }
}
