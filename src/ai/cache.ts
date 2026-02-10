// src/ai/cache.ts
import {
  readFile,
  writeFile,
  mkdir,
  readdir,
  unlink,
  stat,
} from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { AIReview } from '../types/index.js';

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface CachedAnalysis {
  codeHash: string;
  review: AIReview;
  timestamp: number;
  provider: string;
  model: string;
}

export class AnalysisCache {
  private readonly baseDir: string;
  private readonly cacheDir: string;
  private readonly ttlMs: number;

  constructor(baseDir = '.code-reviewer', ttlMs = DEFAULT_TTL_MS) {
    this.baseDir = path.resolve(baseDir);
    this.cacheDir = path.join(this.baseDir, 'cache');
    this.ttlMs = ttlMs;
  }

  private hash(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }

  async get(
    code: string,
    provider: string,
    model: string,
  ): Promise<AIReview | null> {
    const hash = this.hash(code);
    const filePath = path.join(this.cacheDir, `${hash}.json`);
    try {
      const raw = await readFile(filePath, 'utf-8');
      const cached = JSON.parse(raw) as CachedAnalysis;
      const expired = Date.now() - cached.timestamp > this.ttlMs;
      const mismatch = cached.provider !== provider || cached.model !== model;
      if (expired || mismatch) {
        await unlink(filePath).catch(() => {});
        return null;
      }
      return cached.review;
    } catch {
      return null;
    }
  }

  async set(
    code: string,
    review: AIReview,
    provider: string,
    model: string,
  ): Promise<void> {
    const hash = this.hash(code);
    const filePath = path.join(this.cacheDir, `${hash}.json`);
    const cached: CachedAnalysis = {
      codeHash: hash,
      review,
      timestamp: Date.now(),
      provider,
      model,
    };
    await mkdir(this.cacheDir, { recursive: true });
    await writeFile(filePath, JSON.stringify(cached, null, 2));
  }

  async deleteHash(hash: string): Promise<void> {
    const filePath = path.join(this.cacheDir, `${hash}.json`);
    await unlink(filePath).catch(() => {});
  }

  async clear(): Promise<void> {
    try {
      const entries = await readdir(this.cacheDir, { withFileTypes: true });
      for (const e of entries) {
        if (e.isFile() && e.name.endsWith('.json')) {
          await unlink(path.join(this.cacheDir, e.name)).catch(() => {});
        }
      }
    } catch {
      // cache dir may not exist
    }
  }

  async getCacheStats(): Promise<{
    count: number;
    size: number;
    oldestAge: number | null;
  }> {
    try {
      const entries = await readdir(this.cacheDir, { withFileTypes: true });
      const files = entries.filter(
        (e) => e.isFile() && e.name.endsWith('.json'),
      );
      let size = 0;
      let oldestTs: number | null = null;

      for (const f of files) {
        const fp = path.join(this.cacheDir, f.name);
        const fileStat = await stat(fp);
        size += fileStat.size;
        const mtime = fileStat.mtimeMs;
        if (oldestTs === null || mtime < oldestTs) oldestTs = mtime;
      }

      return {
        count: files.length,
        size,
        oldestAge: oldestTs !== null ? Date.now() - oldestTs : null,
      };
    } catch {
      return { count: 0, size: 0, oldestAge: null };
    }
  }
}
