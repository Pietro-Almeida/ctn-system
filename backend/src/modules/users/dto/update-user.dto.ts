import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { Trim } from '../../../common/api.js';
import { normalizeCpf } from '../../../common/cpf.js';
export class UpdateUserDto {
  @ValidateIf((_o, v) => v !== undefined)
  @IsString()
  @Trim()
  @IsNotEmpty()
  @MaxLength(120)
  nome?: string;
  @ValidateIf((_o, v) => v !== undefined)
  @IsEmail()
  @MaxLength(254)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email?: string;
  @ValidateIf((_o, v) => v !== undefined)
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeCpf(value) : value,
  )
  @Matches(/^\d{11}$/, { message: 'CPF inválido' })
  cpf?: string;

  @ValidateIf((_o, v) => v !== undefined)
  @IsIn(['ALUNO', 'PROFESSOR', 'DIRECAO'])
  role?: string;
}
