import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { mkdir, rm } from 'node:fs/promises';
import { IndexStorage } from '../../src/indexer/storage.js';
import type { CodeSnippet } from '../../src/types/index.js';

const STORAGE_DIR = path.join(tmpdir(), 'code-reviewer-storage-test-' + Date.now());

const sampleSnippets: CodeSnippet[] = [
  {
    id: 'test:fn1:1',
    filePath: 'test.ts',
    functionName: 'fn1',
    code: 'function fn1() {}',
    category: 'util',
    metadata: {
      isAsync: false,
      hasErrorHandling: false,
      usesAWS: false,
      complexity: 1,
    },
  },
];

describe('IndexStorage', () => {
  let storage: IndexStorage;

  beforeEach(async () => {
    await mkdir(STORAGE_DIR, { recursive: true });
    storage = new IndexStorage(STORAGE_DIR);
  });

  afterEach(async () => {
    await rm(STORAGE_DIR, { recursive: true, force: true }).catch(() => {});
  });

  it('saveIndex and loadIndex roundtrip', async () => {
    await storage.saveIndex(sampleSnippets, STORAGE_DIR);
    const loaded = await storage.loadIndex();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].functionName).toBe('fn1');
  });

  it('indexExists returns true after save', async () => {
    await storage.saveIndex(sampleSnippets, STORAGE_DIR);
    const exists = await storage.indexExists();
    expect(exists).toBe(true);
  });

  it('loadIndex returns empty array when no index', async () => {
    const loaded = await storage.loadIndex();
    expect(loaded).toEqual([]);
  });

  it('getIndexAge returns age in ms when index exists', async () => {
    await storage.saveIndex(sampleSnippets, STORAGE_DIR);
    const age = await storage.getIndexAge();
    expect(age).not.toBeNull();
    expect(typeof age).toBe('number');
  });

  it('getIndexAge returns null when no index', async () => {
    const storageNoIndex = new IndexStorage(path.join(STORAGE_DIR, 'other'));
    const age = await storageNoIndex.getIndexAge();
    expect(age).toBeNull();
  });

  it('loadStoredIndex returns full stored index', async () => {
    await storage.saveIndex(sampleSnippets, STORAGE_DIR);
    const stored = await storage.loadStoredIndex();
    expect(stored).not.toBeNull();
    expect(stored?.snippets).toHaveLength(1);
    expect(stored?.metadata.totalSnippets).toBe(1);
  });

  it('loadStoredIndex returns null when no index', async () => {
    const storageNoIndex = new IndexStorage(path.join(STORAGE_DIR, 'empty'));
    const stored = await storageNoIndex.loadStoredIndex();
    expect(stored).toBeNull();
  });
});
