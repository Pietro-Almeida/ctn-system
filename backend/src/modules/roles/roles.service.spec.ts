import { RolesService } from './roles.service.js';
import { DatabaseService } from '../../database/database.module.js';
describe('RolesService', () => {
  it('returns database role identifiers rather than fixed identifiers', async () => {
    const rows = [{ id: 92, name: 'DIRECAO' }];
    const service = new RolesService({
      query: vi.fn().mockResolvedValue({ rows }),
    } as unknown as DatabaseService);
    expect(await service.findAll()).toEqual(rows);
  });
});
