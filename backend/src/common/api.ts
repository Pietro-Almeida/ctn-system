import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { Transform, Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import type { Response } from 'express';

export const Trim = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );
export class PageDto {
  @Type(() => Number) @IsInt() @Min(1) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
}
export const offset = (page: PageDto) => (page.page - 1) * page.limit;

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    if (error instanceof HttpException) {
      const body = error.getResponse();
      return response
        .status(error.getStatus())
        .json(
          typeof body === 'string'
            ? { statusCode: error.getStatus(), message: body }
            : body,
        );
    }
    const code = (error as { code?: string })?.code;
    if (code === '23505')
      return response
        .status(409)
        .json({ statusCode: 409, message: 'Registro já cadastrado' });
    if (code === '23503')
      return response
        .status(409)
        .json({
          statusCode: 409,
          message: 'Registro possui vínculos ou referência inválida',
        });
    return response
      .status(500)
      .json({ statusCode: 500, message: 'Erro interno do servidor' });
  }
}
