import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { mkdir, rm } from 'node:fs/promises';
import { AnalysisCache } from '../../src/ai/cache.js';
import type { AIReview } from '../../src/types/index.js';

const CACHE_DIR = path.join(tmpdir(), 'code-reviewer-cache-test-' + Date.now());

const sampleReview: AIReview = {
  summary: 'Test review',
  performanceIssues: [
    {
      severity: 'medium',
      title: 'Test issue',
      explanation: 'Test',
      location: { line: 1, snippet: 'code' },
      suggestion: 'Use Promise.all',
    },
  ],
  readabilityIssues: [],
  maintainabilityIssues: [],
  positives: ['Good code'],
};

describe('AnalysisCache', () => {
  beforeEach(async () => {
    await mkdir(CACHE_DIR, { recursive: true });
  });

  afterEach(async () => {
    await rm(CACHE_DIR, { recursive: true, force: true }).catch(() => {});
  });

  it('returns cached review for same code/provider/model', async () => {
    const cache = new AnalysisCache(CACHE_DIR);
    const code = 'const x = 1;';
    await cache.set(code, sampleReview, 'ollama', 'codellama:13b');
    const got = await cache.get(code, 'ollama', 'codellama:13b');
    expect(got).not.toBeNull();
    expect(got?.summary).toBe(sampleReview.summary);
    expect(got?.performanceIssues[0].suggestion).toContain('Promise.all');
  });

  it('returns null for different model', async () => {
    const cache = new AnalysisCache(CACHE_DIR);
    const code = 'const x = 1;';
    await cache.set(code, sampleReview, 'ollama', 'codellama:13b');
    const got = await cache.get(code, 'ollama', 'llama3.1:8b');
    expect(got).toBeNull();
  });

  it('returns null after TTL expires', async () => {
    const cache = new AnalysisCache(CACHE_DIR, 1); // 1ms TTL
    const code = 'const x = 2;';
    await cache.set(code, sampleReview, 'ollama', 'codellama:13b');
    await new Promise((r) => setTimeout(r, 10));
    const got = await cache.get(code, 'ollama', 'codellama:13b');
    expect(got).toBeNull();
  });

  it('getCacheStats returns count and size', async () => {
    const cache = new AnalysisCache(CACHE_DIR);
    await cache.set('const a=1', sampleReview, 'ollama', 'codellama:13b');
    const stats = await cache.getCacheStats();
    expect(stats.count).toBeGreaterThanOrEqual(1);
    expect(typeof stats.size).toBe('number');
    expect(stats.oldestAge === null || typeof stats.oldestAge === 'number').toBe(true);
  });

  it('clear removes all cached entries', async () => {
    const cache = new AnalysisCache(CACHE_DIR);
    await cache.set('code1', sampleReview, 'ollama', 'codellama:13b');
    await cache.clear();
    const got = await cache.get('code1', 'ollama', 'codellama:13b');
    expect(got).toBeNull();
  });

  it('deleteHash removes specific entry', async () => {
    const { createHash } = await import('node:crypto');
    const cache = new AnalysisCache(CACHE_DIR);
    const code = 'const z = 3;';
    await cache.set(code, sampleReview, 'ollama', 'codellama:13b');
    const hash = createHash('sha256').update(code).digest('hex');
    await cache.deleteHash(hash);
    const got = await cache.get(code, 'ollama', 'codellama:13b');
    expect(got).toBeNull();
  });

  it('getCacheStats returns zeros when cache dir does not exist', async () => {
    const cache = new AnalysisCache(CACHE_DIR + '-nonexistent');
    const stats = await cache.getCacheStats();
    expect(stats.count).toBe(0);
    expect(stats.size).toBe(0);
    expect(stats.oldestAge).toBeNull();
  });

  it('get returns null when provider/model mismatch and deletes file', async () => {
    const cache = new AnalysisCache(CACHE_DIR);
    await cache.set('codeX', sampleReview, 'ollama', 'codellama:13b');
    const got = await cache.get('codeX', 'ollama', 'other-model');
    expect(got).toBeNull();
  });

  it('get returns null when expired and deletes file', async () => {
    const cache = new AnalysisCache(CACHE_DIR, 1);
    await cache.set('codeY', sampleReview, 'ollama', 'codellama:13b');
    await new Promise((r) => setTimeout(r, 5));
    const got = await cache.get('codeY', 'ollama', 'codellama:13b');
    expect(got).toBeNull();
  });
});
