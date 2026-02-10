// src/indexer/incremental.ts
import path from 'node:path';
import { execa } from 'execa';
import fg from 'fast-glob';
import { IndexStorage } from './storage.js';
import { CodebaseIndexer } from './codebase-indexer.js';
import type { CodeSnippet } from '../types/index.js';

export class IncrementalIndexer {
  private readonly storage: IndexStorage;
  private readonly indexer: CodebaseIndexer;
  private readonly projectPath: string;
  private readonly ignorePatterns: string[];

  constructor(
    storage: IndexStorage,
    indexer: CodebaseIndexer,
    projectPath: string,
    ignorePatterns: string[] = ['node_modules', 'dist', 'build'],
  ) {
    this.storage = storage;
    this.indexer = indexer;
    this.projectPath = projectPath;
    this.ignorePatterns = ignorePatterns.flatMap((p) => [
      `**/${p}/**`,
      `**/${p}`,
    ]);
  }

  async getChangedFilesSinceLastIndex(): Promise<string[]> {
    const stored = await this.storage.loadStoredIndex();
    if (!stored?.gitHash) {
      return fg('**/*.ts', {
        cwd: this.projectPath,
        absolute: true,
        ignore: this.ignorePatterns,
      });
    }

    const { stdout } = await execa(
      'git',
      ['diff', '--name-only', stored.gitHash, 'HEAD'],
      { cwd: this.projectPath, reject: false },
    );
    const changed = (stdout || '')
      .split('\n')
      .filter((line) => line.trim().endsWith('.ts'));
    return changed.map((p) => path.join(this.projectPath, p));
  }

  async updateIndex(changedFiles: string[]): Promise<void> {
    const existing = await this.storage.loadIndex();
    const changedSet = new Set(changedFiles.map((p) => path.resolve(p)));
    const unchanged = existing.filter(
      (s) => !changedSet.has(path.resolve(s.filePath)),
    );

    const newSnippets: CodeSnippet[] = [];
    for (const filePath of changedFiles) {
      try {
        const snippets = await this.indexer.indexFile(filePath);
        newSnippets.push(...snippets);
      } catch {
        // skip files that fail to parse
      }
    }

    const merged = [...unchanged, ...newSnippets];
    await this.storage.saveIndex(merged, this.projectPath);
  }
}
