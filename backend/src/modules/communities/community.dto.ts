import { IsNotEmpty, IsString, MaxLength, ValidateIf } from 'class-validator';
import { Trim } from '../../common/api.js';
export class CreateCommunityDto {
  @IsString() @Trim() @IsNotEmpty() @MaxLength(120) nome: string;
  @IsString() @Trim() @IsNotEmpty() @MaxLength(2000) descricao: string;
  @ValidateIf((_o, v) => v !== undefined)
  @IsString()
  @Trim()
  @MaxLength(5000)
  regras = '';
}
export class UpdateCommunityDto {
  @ValidateIf((_o, v) => v !== undefined)
  @IsString()
  @Trim()
  @IsNotEmpty()
  @MaxLength(120)
  nome?: string;
  @ValidateIf((_o, v) => v !== undefined)
  @IsString()
  @Trim()
  @IsNotEmpty()
  @MaxLength(2000)
  descricao?: string;
  @ValidateIf((_o, v) => v !== undefined)
  @IsString()
  @Trim()
  @MaxLength(5000)
  regras?: string;
}
export class ContentDto {
  @IsString() @Trim() @IsNotEmpty() @MaxLength(10000) conteudo: string;
}
