import { describe, it, expect } from 'vitest';
import { AIAnalyzer } from '../../src/ai/analyzer.js';
import type { AIProvider } from '../../src/ai/providers/base-provider.js';
import type { Config } from '../../src/config/loader.js';
import type { CodeSnippet } from '../../src/types/index.js';

const minimalConfig: Config = {
  ai: {
    provider: 'ollama',
    ollama: { host: 'http://localhost:11434', model: 'codellama:13b' },
  },
  rules: { performance: true, readability: true, maintainability: true },
  ignore: ['node_modules', 'dist', 'build'],
  indexing: { enabled: true, embeddingModel: 'voyage-code-2' },
};

const validReview = {
  summary: 'OK',
  performanceIssues: [],
  readabilityIssues: [],
  maintainabilityIssues: [],
  positives: ['Good'],
};

const baseContext = {
  targetCode: 'const x = 1;',
  metadata: {
    filePath: 'x.ts',
    functions: [],
    classes: [],
    imports: [],
    complexity: 0,
    linesOfCode: 1,
  },
  detectedIssues: [] as { type: string; severity: string; title: string; description: string; location: { file: string; line: number } }[],
  similarPatterns: [] as CodeSnippet[],
};

describe('AIAnalyzer', () => {
  it('parseResponse extracts JSON from code fence', async () => {
    const mockProvider: AIProvider = {
      name: 'mock',
      analyzeCode: async () =>
        'Here is the review:\n```json\n' + JSON.stringify(validReview) + '\n```',
    };
    const analyzer = new AIAnalyzer(minimalConfig, undefined, mockProvider);
    const review = await analyzer.analyzeCode({ ...baseContext });
    expect(review.summary).toBe('OK');
    expect(review.positives).toContain('Good');
  });

  it('parseResponse handles raw JSON without fence', async () => {
    const mockProvider: AIProvider = {
      name: 'mock',
      analyzeCode: async () => JSON.stringify(validReview),
    };
    const analyzer = new AIAnalyzer(minimalConfig, undefined, mockProvider);
    const review = await analyzer.analyzeCode({ ...baseContext });
    expect(review.summary).toBe('OK');
  });

  it('buildPrompt includes projectContext when provided', async () => {
    let capturedPrompt = '';
    const mockProvider: AIProvider = {
      name: 'mock',
      analyzeCode: async (p) => {
        capturedPrompt = p;
        return JSON.stringify(validReview);
      },
    };
    const analyzer = new AIAnalyzer(minimalConfig, undefined, mockProvider);
    await analyzer.analyzeCode({
      ...baseContext,
      projectContext: 'This is a test project.',
    });
    expect(capturedPrompt).toContain('PROJECT CONTEXT');
    expect(capturedPrompt).toContain('This is a test project.');
  });

  it('buildPrompt includes detected issues when present', async () => {
    let capturedPrompt = '';
    const mockProvider: AIProvider = {
      name: 'mock',
      analyzeCode: async (p) => {
        capturedPrompt = p;
        return JSON.stringify(validReview);
      },
    };
    const analyzer = new AIAnalyzer(minimalConfig, undefined, mockProvider);
    await analyzer.analyzeCode({
      ...baseContext,
      detectedIssues: [
        {
          type: 'performance',
          severity: 'medium',
          title: 'Test',
          description: 'Test issue',
          location: { file: 'x.ts', line: 1 },
        },
      ],
    });
    expect(capturedPrompt).toContain('STATIC ANALYSIS');
    expect(capturedPrompt).toContain('Test issue');
  });

  it('createProvider throws for unknown provider', () => {
    const badConfig = {
      ...minimalConfig,
      ai: { ...minimalConfig.ai, provider: 'unknown' as 'ollama' },
    };
    expect(() => new AIAnalyzer(badConfig)).toThrow(/Unknown AI provider/);
  });

  it('createProvider throws for claude without api key', () => {
    const config: Config = {
      ...minimalConfig,
      ai: { ...minimalConfig.ai, provider: 'claude', claude: {} },
    };
    delete process.env.ANTHROPIC_API_KEY;
    expect(() => new AIAnalyzer(config)).toThrow(/ANTHROPIC_API_KEY/);
  });

  it('createProvider throws for gemini without api key', () => {
    const config: Config = {
      ...minimalConfig,
      ai: { ...minimalConfig.ai, provider: 'gemini', gemini: {} },
    };
    delete process.env.GEMINI_API_KEY;
    expect(() => new AIAnalyzer(config)).toThrow(/GEMINI_API_KEY/);
  });

  it('uses cache when provided', async () => {
    const { AnalysisCache } = await import('../../src/ai/cache.js');
    const { createHash } = await import('node:crypto');
    const cacheDir = (await import('node:os')).tmpdir() + '/cov-cache-' + Date.now();
    const cache = new AnalysisCache(cacheDir);
    const mockProvider: AIProvider = {
      name: 'mock',
      analyzeCode: async () => JSON.stringify(validReview),
    };
    const analyzer = new AIAnalyzer(minimalConfig, cache, mockProvider);
    const r1 = await analyzer.analyzeCode({ ...baseContext });
    const r2 = await analyzer.analyzeCode({ ...baseContext });
    expect(r1.summary).toBe(r2.summary);
    await (await import('node:fs/promises')).rm(cacheDir, { recursive: true, force: true });
  });

  it('parseResponse extracts JSON when braceMatch finds object', async () => {
    const mockProvider: AIProvider = {
      name: 'mock',
      analyzeCode: async () => 'prefix ' + JSON.stringify(validReview) + ' suffix',
    };
    const analyzer = new AIAnalyzer(minimalConfig, undefined, mockProvider);
    const review = await analyzer.analyzeCode({ ...baseContext });
    expect(review.summary).toBe('OK');
  });
});
