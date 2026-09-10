import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { Trim } from '../../../common/api.js';
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
  @IsIn(['ALUNO', 'PROFESSOR', 'DIRECAO'])
  role?: string;
  @ValidateIf((_o, v) => v !== undefined) @IsBoolean() ativo?: boolean;
}
