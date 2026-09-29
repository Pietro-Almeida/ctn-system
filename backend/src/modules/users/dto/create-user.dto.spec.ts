import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateUserDto } from './create-user.dto.js';

describe('CreateUserDto', () => {
  const valid = {
    nome: 'Ana',
    cpf: '52998224725',
    email: 'ana@escola.test',
    senha: 'uma-senha-longa',
    role: 'ALUNO',
  };

  it('accepts a valid registration', async () => {
    expect(await validate(plainToInstance(CreateUserDto, valid))).toHaveLength(
      0,
    );
  });

  it.each([undefined, null, '', '   '])('accepts registration without CPF (%s)', async (cpf) => {
    expect(await validate(plainToInstance(CreateUserDto, { ...valid, cpf }))).toHaveLength(0);
  });

  it('rejects a supplied malformed CPF', async () => {
    const errors = await validate(plainToInstance(CreateUserDto, { ...valid, cpf: '123' }));
    expect(errors.some((error) => error.property === 'cpf')).toBe(true);
  });

  it.each([undefined, '', 'curta', 'a'.repeat(129)])(
    'rejects an invalid password',
    async (senha) => {
      const errors = await validate(
        plainToInstance(CreateUserDto, { ...valid, senha }),
      );
      expect(errors.some((error) => error.property === 'senha')).toBe(true);
    },
  );
});
