import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const directory = () => resolve(process.env.NEWS_COVERS_DIR ?? 'uploads/news');
const stored = /^file:([a-f0-9]{64})\.(jpeg|png|webp)$/;

export async function storeCover(value: string): Promise<string> {
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) throw new BadRequestException('Capa inválida');
  const bytes = Buffer.from(match[2], 'base64');
  const valid = match[1] === 'jpeg' ? bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
    : match[1] === 'png' ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  if (!valid || bytes.length > 1125000) throw new BadRequestException('Capa inválida ou muito grande');
  const filename = `${createHash('sha256').update(bytes).digest('hex')}.${match[1]}`;
  await mkdir(directory(), { recursive: true });
  await writeFile(resolve(directory(), filename), bytes, { flag: 'wx' }).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'EEXIST') throw error;
  });
  return `file:${filename}`;
}

export async function readCover(value: string) {
  const match = stored.exec(value);
  if (!match) throw new BadRequestException('Referência de capa inválida');
  return { bytes: await readFile(resolve(directory(), `${match[1]}.${match[2]}`)), mime: `image/${match[2]}` };
}
