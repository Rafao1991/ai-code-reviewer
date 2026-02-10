import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { TypeScriptAnalyzer } from '../../src/analyzer/ts-parser.js';
import { PatternDetector } from '../../src/analyzer/patterns.js';
import { AIAnalyzer } from '../../src/ai/analyzer.js';
import { ReportFormatter } from '../../src/reporter/formatter.js';
import type { AIProvider } from '../../src/ai/providers/base-provider.js';
import type { Config } from '../../src/config/loader.js';
import type { CodeSnippet } from '../../src/types/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEMO_DIR = path.join(path.resolve(__dirname, '../..'), 'demo');
const TEST_DIR = path.join(tmpdir(), 'code-reviewer-integration-' + Date.now());

const MOCK_REVIEW_JSON = JSON.stringify({
  summary: 'Code has sequential awaits that could be parallelized.',
  performanceIssues: [
    {
      severity: 'medium',
      title: 'Sequential awaits',
      explanation: 'Multiple await statements run sequentially.',
      location: { line: 5, snippet: 'await fetchOrder();' },
      suggestion: 'Use Promise.all to run independent promises in parallel.',
      example: 'const [order, user] = await Promise.all([fetchOrder(), fetchUser()]);',
    },
  ],
  readabilityIssues: [],
  maintainabilityIssues: [],
  positives: ['Clear function structure'],
});

const mockProvider: AIProvider = {
  name: 'mock',
  analyzeCode: async () => MOCK_REVIEW_JSON,
};

const minimalConfig: Config = {
  ai: {
    provider: 'ollama',
    ollama: { host: 'http://localhost:11434', model: 'codellama:13b' },
  },
  rules: { performance: true, readability: true, maintainability: true },
  ignore: ['node_modules', 'dist', 'build'],
  indexing: { enabled: true, embeddingModel: 'voyage-code-2' },
};

describe('Full analyze flow', () => {
  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    await rm(TEST_DIR, { recursive: true, force: true }).catch(() => {});
  });

  it('runs parse → detect → AI (mock) → format and produces report with performance suggestion', async () => {
    const filePath = path.join(TEST_DIR, 'service.ts');
    const source = `
async function processOrder(orderId: string) {
  const order = await fetchOrder(orderId);
  const user = await fetchUser(order.userId);
  const inventory = await checkInventory(order.items);
  return { order, user, inventory };
}
`;
    await writeFile(filePath, source);

    const tsAnalyzer = new TypeScriptAnalyzer();
    const patternDetector = new PatternDetector();
    const aiAnalyzer = new AIAnalyzer(minimalConfig, undefined, mockProvider);
    const formatter = new ReportFormatter();

    const metadata = await tsAnalyzer.analyzeFile(filePath);
    const detectedIssues = patternDetector.detectIssues(metadata, source);
    const similarPatterns: CodeSnippet[] = [];

    const review = await aiAnalyzer.analyzeCode({
      targetCode: source,
      metadata,
      detectedIssues,
      similarPatterns,
    });

    expect(review.performanceIssues.length).toBeGreaterThanOrEqual(1);
    const perf = review.performanceIssues[0];
    expect(perf.suggestion).toMatch(/Promise\.all|parallel/i);

    const report = formatter.format(review, 'text');
    expect(report).toContain('Sequential');
    expect(report).toContain('Promise.all');
  });

  it('analyze demo/sample-with-issues.ts produces performance and readability issues', async () => {
    const { readFile } = await import('node:fs/promises');
    const filePath = path.join(DEMO_DIR, 'sample-with-issues.ts');
    const source = await readFile(filePath, 'utf-8');

    const tsAnalyzer = new TypeScriptAnalyzer();
    const patternDetector = new PatternDetector();

    const metadata = await tsAnalyzer.analyzeFile(filePath);
    const detectedIssues = patternDetector.detectIssues(metadata, source);

    expect(detectedIssues.some((i) => i.type === 'performance')).toBe(true);
    expect(detectedIssues.some((i) => i.type === 'readability')).toBe(true);
  });

  it('formatter handles review with no issues', () => {
    const formatter = new ReportFormatter();
    const review: import('../../src/types/index.js').AIReview = {
      summary: 'All good.',
      performanceIssues: [],
      readabilityIssues: [],
      maintainabilityIssues: [],
      positives: ['Clean code'],
    };
    const text = formatter.format(review, 'text');
    expect(text).toContain('All good');
    expect(text).toContain('Positives');
  });
});
