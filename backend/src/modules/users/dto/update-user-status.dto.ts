import { IsIn } from 'class-validator';

export class UpdateUserStatusDto {
  @IsIn(['APROVAR', 'RECUSAR', 'DESATIVAR', 'REATIVAR'])
  acao: 'APROVAR' | 'RECUSAR' | 'DESATIVAR' | 'REATIVAR';
}
