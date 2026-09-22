import { SetMetadata } from '@nestjs/common';
import type { Request } from 'express';
import type { Role } from '../roles/role.enum.js';

export const Public = () => SetMetadata('auth:public', true);
export const RequireRoles = (...roles: Role[]) =>
  SetMetadata('auth:roles', roles);
export interface AuthUser {
  id: number;
  nome: string;
  email: string;
  role: string;
}
export interface AuthRequest extends Request {
  user: AuthUser;
  token: string;
}
