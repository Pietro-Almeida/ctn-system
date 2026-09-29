import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { storeCover, readCover } from './news-covers.js';

describe('Armazenamento de capas', () => {
  let directory: string;
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'ctn-covers-test-'));
    vi.stubEnv('NEWS_COVERS_DIR', directory);
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    if (!resolve(directory).startsWith(resolve(tmpdir()) + '\\ctn-covers-test-') && !resolve(directory).startsWith(resolve(tmpdir()) + '/ctn-covers-test-')) throw new Error('Invalid test directory');
    await rm(directory, { recursive: true });
  });
  it('stores binary data separately and reuses the same content hash', async () => {
    const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jQ1sAAAAASUVORK5CYII=';
    const reference = await storeCover(png);
    expect(reference).toMatch(/^file:[a-f0-9]{64}\.png$/);
    expect(await storeCover(png)).toBe(reference);
    expect((await readCover(reference)).bytes).toEqual(Buffer.from(png.split(',')[1], 'base64'));
  });
  it('rejects fake image data and path traversal', async () => {
    await expect(storeCover('data:image/png;base64,aGVsbG8=')).rejects.toThrow();
    await expect(readCover('file:../../.env')).rejects.toThrow();
  });
});
