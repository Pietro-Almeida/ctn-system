import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Post,
  Req,
} from '@nestjs/common';
import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { AuthService } from './auth.service.js';
import { Public } from './auth.metadata.js';
import type { AuthRequest } from './auth.metadata.js';

export class LoginDto {
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  senha: string;
}

export class ChangePasswordDto {
  @IsString() @MinLength(1) @MaxLength(128) senhaAtual: string;
  @IsString() @MinLength(12) @MaxLength(128) novaSenha: string;
}
export class ResetPasswordDto {
  @IsString() @Matches(/^[A-Za-z0-9_-]{43}$/) token: string;
  @IsString() @MinLength(12) @MaxLength(128) novaSenha: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Public()
  @Post('login')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  login(@Body() dto: LoginDto, @Req() req: AuthRequest) {
    return this.auth.login(dto.email, dto.senha, req.ip ?? 'unknown');
  }

  @Get('me')
  @Header('Cache-Control', 'no-store')
  me(@Req() req: AuthRequest) {
    return req.user;
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Req() req: AuthRequest) {
    return this.auth.logout(req.token);
  }

  @Post('change-password')
  @HttpCode(204)
  async changePassword(
    @Req() req: AuthRequest,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.auth.limit('change:' + req.user.id);
    await this.auth.changePassword(req.user.id, dto.senhaAtual, dto.novaSenha);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(204)
  resetPassword(@Req() req: AuthRequest, @Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(
      dto.token,
      dto.novaSenha,
      req.ip ?? 'unknown',
    );
  }
}
