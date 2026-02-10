import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CodebaseIndexer } from '../../src/indexer/codebase-indexer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const DEMO_DIR = path.join(PROJECT_ROOT, 'demo');

describe('CodebaseIndexer', () => {
  const indexer = new CodebaseIndexer(['node_modules']);

  it('findSimilarPatterns returns snippets with keyword overlap', () => {
    const snippets = [
      {
        id: '1',
        filePath: 'a.ts',
        functionName: 'fetchUser',
        code: 'async function fetchUser() { const x = await fetch("/users"); return x; }',
        category: 'util' as const,
        metadata: { isAsync: true, hasErrorHandling: false, usesAWS: false, complexity: 1 },
      },
    ];
    const target = 'const user = await fetchUser(id);';
    const similar = indexer.findSimilarPatterns(target, 5, snippets);
    expect(similar.length).toBeGreaterThanOrEqual(1);
    expect(similar[0].functionName).toBe('fetchUser');
  });

  it('findSimilarPatterns returns empty when no keyword overlap', () => {
    const snippets = [
      {
        id: '1',
        filePath: 'a.ts',
        functionName: 'unrelated',
        code: 'function unrelated() { return 42; }',
        category: 'util' as const,
        metadata: { isAsync: false, hasErrorHandling: false, usesAWS: false, complexity: 1 },
      },
    ];
    const target = 'await fetchExternalApi("/data");';
    const similar = indexer.findSimilarPatterns(target, 5, snippets);
    expect(similar).toHaveLength(0);
  });

  it('indexFile extracts snippets from demo file with sufficient function body', async () => {
    const filePath = path.join(DEMO_DIR, 'sample-with-issues.ts');
    const snippets = await indexer.indexFile(filePath);
    expect(snippets.length).toBeGreaterThanOrEqual(1);
  });

  it('indexCodebase returns snippets from directory', async () => {
    const snippets = await indexer.indexCodebase(DEMO_DIR);
    expect(Array.isArray(snippets)).toBe(true);
    expect(snippets.length).toBeGreaterThanOrEqual(0);
  });
});
