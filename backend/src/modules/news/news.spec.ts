import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { NewsQueryDto, NewsService } from './news.module.js';
import { DatabaseService } from '../../database/database.module.js';

describe('Jornal paginado', () => {
  it('validates page bounds and search length', async () => {
    for (const input of [{ page: 0 }, { limit: 101 }, { q: 'x'.repeat(201) }, { authorId: -1 }]) {
      expect((await validate(plainToInstance(NewsQueryDto, input))).length).toBeGreaterThan(0);
    }
    expect(await validate(plainToInstance(NewsQueryDto, { page: '2', limit: '12', q: 'Ciências' }))).toHaveLength(0);
  });

  it('filters before pagination and returns total separately from the current page', async () => {
    const query = vi.fn().mockResolvedValueOnce({ rows: [{ id: 13, conteudo: 'Resumo' }] }).mockResolvedValueOnce({ rows: [{ total: 30 }] });
    const service = new NewsService({ query } as unknown as DatabaseService);
    const result = await service.search(plainToInstance(NewsQueryDto, { page: 2, limit: 12, q: ' CIÊNCIAS ', categories: 'CIENCIAS,PROJETO' }));
    expect(result).toEqual({ items: [{ id: 13, conteudo: 'Resumo' }], total: 30, page: 2, limit: 12 });
    expect(query.mock.calls[0][1]).toEqual(['ciencias', ['CIENCIAS', 'PROJETO'], null, 12, 12]);
    expect(query.mock.calls[0][0]).toContain('left(regexp_replace');
    expect(query.mock.calls[0][0]).not.toContain('SELECT n.*');
    expect(query.mock.calls[0][0]).toContain('/cover?v=');
  });

  it('keeps an empty page distinct from an empty archive', async () => {
    const query = vi.fn().mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ total: 12 }] });
    const service = new NewsService({ query } as unknown as DatabaseService);
    expect(await service.search(plainToInstance(NewsQueryDto, { page: 2, limit: 12 }))).toMatchObject({ items: [], total: 12 });
  });
});
