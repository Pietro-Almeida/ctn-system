import { describe, expect, it } from 'vitest';
import { isValidCpf, maskCpf, normalizeCpf } from './cpf.js';

describe('CPF', () => {
  it('normaliza máscara', () => {
    expect(normalizeCpf('529.982.247-25')).toBe('52998224725');
  });

  it('aceita CPF com dígitos verificadores válidos', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
  });

  it('rejeita sequência repetida', () => {
    expect(isValidCpf('111.111.111-11')).toBe(false);
  });

  it('rejeita dígitos verificadores inválidos', () => {
    expect(isValidCpf('529.982.247-24')).toBe(false);
  });

  it('mascara CPF para telas administrativas', () => {
    expect(maskCpf('52998224725')).toBe('***.***.***-25');
  });
});
