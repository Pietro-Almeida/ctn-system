import { hashPassword, verifyPassword } from './password.js';
describe('Passwords', () => {
  it('verifies the original password and rejects a different one', async () => {
    const hash = await hashPassword('uma-senha-longa');
    expect(await verifyPassword('uma-senha-longa', hash)).toBe(true);
    expect(await verifyPassword('outra-senha-longa', hash)).toBe(false);
    expect(await hashPassword('uma-senha-longa')).not.toBe(hash);
  });
  it.each(['TEMPORARIO', '', 'scrypt$bad$bad'])(
    'rejects malformed legacy hashes',
    async (hash) => {
      expect(await verifyPassword('uma-senha-longa', hash)).toBe(false);
    },
  );
});
