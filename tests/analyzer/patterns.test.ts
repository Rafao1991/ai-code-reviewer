import { describe, it, expect } from 'vitest';
import { PatternDetector } from '../../src/analyzer/patterns.js';
import type { CodeMetadata } from '../../src/types/index.js';

describe('PatternDetector', () => {
  const detector = new PatternDetector();

  it('detects sequential awaits and suggests Promise.all', () => {
    const source = `async function loadData() {
  const order = await fetchOrder();
  const user = await fetchUser(order.userId);
  return { order, user };
}`;
    const lines = source.split('\n');
    const metadata: CodeMetadata = {
      filePath: 'test.ts',
      functions: [
        {
          name: 'loadData',
          lineNumber: 1,
          endLineNumber: lines.length + 1,
          parameters: [],
          returnType: 'Promise<void>',
          isAsync: true,
          bodyLength: 5,
          cyclomaticComplexity: 1,
        },
      ],
      classes: [],
      imports: [],
      complexity: 1,
      linesOfCode: lines.length,
    };
    const issues = detector.detectIssues(metadata, source);
    const perf = issues.filter((i) => i.type === 'performance');
    expect(perf.length).toBeGreaterThanOrEqual(1);
    const issue = perf[0];
    expect(issue.title).toContain('Sequential');
    expect(issue.suggestedFix).toMatch(/Promise\.all|parallel/i);
  });

  it('detects long function (readability)', () => {
    const source = `function veryLong() {
  const a=1,b=2,c=3,d=4,e=5,f=6,g=7,h=8,i=9,j=10,k=11,l=12,m=13,n=14,o=15,p=16,q=17,r=18,s=19,t=20,u=21,v=22,w=23,x=24,y=25,z=26;
  return a+b+c+d+e+f+g+h+i+j+k+l+m+n+o+p+q+r+s+t+u+v+w+x+y+z;
}`;
    const lines = source.split('\n');
    const metadata: CodeMetadata = {
      filePath: 'test.ts',
      functions: [
        {
          name: 'veryLong',
          lineNumber: 1,
          endLineNumber: lines.length + 1,
          parameters: [],
          returnType: 'number',
          isAsync: false,
          bodyLength: 30,
          cyclomaticComplexity: 1,
        },
      ],
      classes: [],
      imports: [],
      complexity: 1,
      linesOfCode: lines.length,
    };
    const issues = detector.detectIssues(metadata, source);
    const read = issues.filter((i) => i.type === 'readability');
    expect(read.length).toBeGreaterThanOrEqual(1);
  });

  it('detects high file complexity (maintainability)', () => {
    const metadata: CodeMetadata = {
      filePath: 'test.ts',
      functions: Array.from({ length: 20 }, (_, i) => ({
        name: `fn${i}`,
        lineNumber: i * 3,
        endLineNumber: i * 3 + 2,
        parameters: [],
        returnType: 'void',
        isAsync: false,
        bodyLength: 1,
        cyclomaticComplexity: 3,
      })),
      classes: [],
      imports: [],
      complexity: 60,
      linesOfCode: 100,
    };
    const issues = detector.detectIssues(metadata, '// many functions');
    const maint = issues.filter((i) => i.type === 'maintainability');
    expect(maint.length).toBeGreaterThanOrEqual(1);
  });

  it('returns empty when code has no issues', () => {
    const source = `function add(a: number, b: number) { return a + b; }`;
    const metadata: CodeMetadata = {
      filePath: 'test.ts',
      functions: [
        {
          name: 'add',
          lineNumber: 1,
          endLineNumber: 2,
          parameters: ['a', 'b'],
          returnType: 'number',
          isAsync: false,
          bodyLength: 1,
          cyclomaticComplexity: 1,
        },
      ],
      classes: [],
      imports: [],
      complexity: 1,
      linesOfCode: 1,
    };
    const issues = detector.detectIssues(metadata, source);
    expect(issues.length).toBe(0);
  });

  it('does not flag async function with single await', () => {
    const source = `async function fetchOne() { const x = await get(); return x; }`;
    const metadata: CodeMetadata = {
      filePath: 'test.ts',
      functions: [
        {
          name: 'fetchOne',
          lineNumber: 1,
          endLineNumber: 2,
          parameters: [],
          returnType: 'Promise<unknown>',
          isAsync: true,
          bodyLength: 2,
          cyclomaticComplexity: 1,
        },
      ],
      classes: [],
      imports: [],
      complexity: 1,
      linesOfCode: 1,
    };
    const issues = detector.detectIssues(metadata, source);
    const perf = issues.filter((i) => i.type === 'performance');
    expect(perf.length).toBe(0);
  });
});
