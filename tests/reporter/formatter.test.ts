import { describe, it, expect } from 'vitest';
import { ReportFormatter } from '../../src/reporter/formatter.js';
import type { AIReview } from '../../src/types/index.js';

const reviewWithIssues: AIReview = {
  summary: 'Found some issues.',
  performanceIssues: [
    {
      severity: 'medium',
      title: 'Sequential awaits',
      explanation: 'Could parallelize.',
      location: { line: 5, snippet: 'await a();' },
      suggestion: 'Use Promise.all',
      example: 'await Promise.all([a(), b()])',
    },
  ],
  readabilityIssues: [],
  maintainabilityIssues: [],
  positives: ['Clear structure'],
};

const reviewEmpty: AIReview = {
  summary: 'Code looks good.',
  performanceIssues: [],
  readabilityIssues: [],
  maintainabilityIssues: [],
  positives: ['Clean', 'Well-typed'],
};

describe('ReportFormatter', () => {
  const formatter = new ReportFormatter();

  it('formatJSON returns parseable JSON', () => {
    const out = formatter.format(reviewWithIssues, 'json');
    const parsed = JSON.parse(out) as AIReview;
    expect(parsed.summary).toBe(reviewWithIssues.summary);
    expect(parsed.performanceIssues).toHaveLength(1);
  });

  it('formatMarkdown includes ## Summary', () => {
    const out = formatter.format(reviewWithIssues, 'markdown');
    expect(out).toContain('## Summary');
    expect(out).toContain(reviewWithIssues.summary);
  });

  it('formatText includes summary for empty issues', () => {
    const out = formatter.format(reviewEmpty, 'text');
    expect(out).toContain('Code looks good');
    expect(out).toContain('Positives');
  });

  it('formatMarkdown includes code block when example present', () => {
    const out = formatter.format(reviewWithIssues, 'markdown');
    expect(out).toContain('```typescript');
    expect(out).toContain('Promise.all');
  });

  it('formatText includes severity for high/medium/low', () => {
    const review: AIReview = {
      summary: 'Mixed',
      performanceIssues: [
        {
          severity: 'high',
          title: 'Critical',
          explanation: 'Bad',
          location: { line: 1, snippet: 'x' },
          suggestion: 'Fix it',
        },
      ],
      readabilityIssues: [],
      maintainabilityIssues: [],
      positives: [],
    };
    const out = formatter.format(review, 'text');
    expect(out).toContain('Critical');
    expect(out).toContain('Fix it');
  });
});
