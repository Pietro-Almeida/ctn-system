import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';

import { Role } from '../../roles/role.enum.js';
import { Transform } from 'class-transformer';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  nome: string;

  @IsEmail()
  @MaxLength(254)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  senha: string;

  @IsIn([Role.ALUNO, Role.PROFESSOR, Role.DIRECAO])
  role: Role;
}
