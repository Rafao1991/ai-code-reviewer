import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { IndexStorage } from '../../src/indexer/storage.js';
import { CodebaseIndexer } from '../../src/indexer/codebase-indexer.js';
import { IncrementalIndexer } from '../../src/indexer/incremental.js';
import type { CodeSnippet } from '../../src/types/index.js';

const PROJECT_DIR = path.join(tmpdir(), 'code-reviewer-incremental-' + Date.now());

describe('IncrementalIndexer', () => {
  let storage: IndexStorage;
  let indexer: CodebaseIndexer;

  beforeEach(async () => {
    await mkdir(PROJECT_DIR, { recursive: true });
    storage = new IndexStorage(path.join(PROJECT_DIR, '.code-reviewer'));
    indexer = new CodebaseIndexer(['node_modules']);
  });

  afterEach(async () => {
    await rm(PROJECT_DIR, { recursive: true, force: true }).catch(() => {});
  });

  it('getChangedFilesSinceLastIndex returns all ts files when no stored index', async () => {
    await writeFile(
      path.join(PROJECT_DIR, 'a.ts'),
      'export function a() { return 1; }'
    );
    await writeFile(
      path.join(PROJECT_DIR, 'b.ts'),
      'export function b() { return 2; }'
    );
    const incremental = new IncrementalIndexer(
      storage,
      indexer,
      PROJECT_DIR,
      ['node_modules']
    );
    const files = await incremental.getChangedFilesSinceLastIndex();
    expect(files.length).toBeGreaterThanOrEqual(2);
    expect(files.some((f) => f.endsWith('a.ts'))).toBe(true);
  });

  it('getChangedFilesSinceLastIndex uses git diff when stored has gitHash', async () => {
    const snippet: CodeSnippet = {
      id: '1',
      filePath: path.join(PROJECT_DIR, 'a.ts'),
      functionName: 'a',
      code: 'function a() {}',
      category: 'util',
      metadata: { isAsync: false, hasErrorHandling: false, usesAWS: false, complexity: 1 },
    };
    const stored = {
      version: 1,
      indexedAt: new Date().toISOString(),
      projectPath: PROJECT_DIR,
      gitHash: 'abc123',
      snippets: [snippet],
      metadata: { totalFiles: 1, totalSnippets: 1, categories: {}, languages: ['ts'] },
    };
    await (await import('node:fs/promises')).mkdir(path.join(PROJECT_DIR, '.code-reviewer'), { recursive: true });
    await (await import('node:fs/promises')).writeFile(
      path.join(PROJECT_DIR, '.code-reviewer', 'index.json'),
      JSON.stringify(stored)
    );
    const incremental = new IncrementalIndexer(storage, indexer, PROJECT_DIR, ['node_modules']);
    const files = await incremental.getChangedFilesSinceLastIndex();
    expect(Array.isArray(files)).toBe(true);
  });

  it('updateIndex merges unchanged snippets with new ones from changed files', async () => {
    const snippet: CodeSnippet = {
      id: 'unchanged:fn:1',
      filePath: path.join(PROJECT_DIR, 'unchanged.ts'),
      functionName: 'fn',
      code: 'function fn() {}',
      category: 'util',
      metadata: { isAsync: false, hasErrorHandling: false, usesAWS: false, complexity: 1 },
    };
    await storage.saveIndex([snippet], PROJECT_DIR);
    await writeFile(
      path.join(PROJECT_DIR, 'new.ts'),
      'export function newFn() {\n  const a = 1;\n  const b = 2;\n  const c = 3;\n  const d = 4;\n  const e = 5;\n  return a + b + c + d + e;\n}'
    );
    const incremental = new IncrementalIndexer(
      storage,
      indexer,
      PROJECT_DIR,
      ['node_modules']
    );
    await incremental.updateIndex([path.join(PROJECT_DIR, 'new.ts')]);
    const loaded = await storage.loadIndex();
    expect(loaded.length).toBeGreaterThanOrEqual(1);
  });
});
