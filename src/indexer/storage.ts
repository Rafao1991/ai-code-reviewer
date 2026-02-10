// src/indexer/storage.ts
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { execa } from 'execa';
import type { CodeSnippet } from '../types/index.js';

export interface StoredIndex {
  version: number;
  indexedAt: string;
  projectPath: string;
  gitHash?: string;
  snippets: CodeSnippet[];
  metadata: {
    totalFiles: number;
    totalSnippets: number;
    categories: Record<string, number>;
    languages: string[];
  };
}

const INDEX_VERSION = 1;

export class IndexStorage {
  private readonly baseDir: string;
  private readonly indexPath: string;
  readonly cacheDir: string;

  constructor(baseDir = '.code-reviewer') {
    this.baseDir = path.resolve(baseDir);
    this.indexPath = path.join(this.baseDir, 'index.json');
    this.cacheDir = path.join(this.baseDir, 'cache');
  }

  async saveIndex(snippets: CodeSnippet[], projectPath: string): Promise<void> {
    const categories = getCategoryStats(snippets);
    const filePaths = [...new Set(snippets.map((s) => s.filePath))];
    const stored: StoredIndex = {
      version: INDEX_VERSION,
      indexedAt: new Date().toISOString(),
      projectPath,
      gitHash: await getCurrentGitHash(projectPath).catch(() => undefined),
      snippets,
      metadata: {
        totalFiles: filePaths.length,
        totalSnippets: snippets.length,
        categories,
        languages: ['typescript'],
      },
    };
    await mkdir(path.dirname(this.indexPath), { recursive: true });
    await writeFile(this.indexPath, JSON.stringify(stored, null, 2));
  }

  async loadIndex(): Promise<CodeSnippet[]> {
    try {
      const raw = await readFile(this.indexPath, 'utf-8');
      const parsed = JSON.parse(raw) as StoredIndex;
      return parsed.snippets ?? [];
    } catch {
      return [];
    }
  }

  async loadStoredIndex(): Promise<StoredIndex | null> {
    try {
      const raw = await readFile(this.indexPath, 'utf-8');
      return JSON.parse(raw) as StoredIndex;
    } catch {
      return null;
    }
  }

  async indexExists(): Promise<boolean> {
    try {
      await access(this.indexPath, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  async getIndexAge(): Promise<number | null> {
    try {
      const raw = await readFile(this.indexPath, 'utf-8');
      const parsed = JSON.parse(raw) as StoredIndex;
      const indexedAt = new Date(parsed.indexedAt).getTime();
      return Date.now() - indexedAt;
    } catch {
      return null;
    }
  }
}

function getCategoryStats(snippets: CodeSnippet[]): Record<string, number> {
  const stats: Record<string, number> = {};
  for (const s of snippets) {
    stats[s.category] = (stats[s.category] ?? 0) + 1;
  }
  return stats;
}

async function getCurrentGitHash(cwd: string): Promise<string | undefined> {
  const { stdout } = await execa('git', ['rev-parse', 'HEAD'], {
    cwd,
    reject: false,
  });
  return stdout?.trim() || undefined;
}

export function getTimeAgo(isoDate: string): string {
  const ms = Date.now() - new Date(isoDate).getTime();
  if (ms < 60_000) return 'just now';
  if (ms < 3600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86400_000) return `${Math.floor(ms / 3600_000)}h ago`;
  return `${Math.floor(ms / 86400_000)}d ago`;
}
