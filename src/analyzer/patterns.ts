// src/analyzer/patterns.ts
import type { CodeMetadata, FunctionInfo, CodeIssue } from '../types/index.js';

export class PatternDetector {
  detectIssues(metadata: CodeMetadata, sourceCode: string): CodeIssue[] {
    return [
      ...this.detectPerformanceIssues(metadata, sourceCode),
      ...this.detectReadabilityIssues(metadata, sourceCode),
      ...this.detectMaintainabilityIssues(metadata, sourceCode),
    ];
  }

  private detectPerformanceIssues(
    metadata: CodeMetadata,
    source: string
  ): CodeIssue[] {
    const issues: CodeIssue[] = [];
    for (const fn of metadata.functions) {
      if (fn.isAsync && this.hasSequentialAwaits(fn, source)) {
        issues.push({
          type: 'performance',
          severity: 'medium',
          location: {
            file: metadata.filePath,
            line: fn.lineNumber,
            functionName: fn.name,
          },
          title: 'Sequential async operations detected',
          description:
            'Multiple await statements execute sequentially. Consider Promise.all() for parallel execution.',
          suggestedFix: 'Use Promise.all() to run independent promises in parallel.',
          codeSnippet: this.extractCodeSnippet(source, fn.lineNumber),
        });
      }
    }
    return issues;
  }

  private hasSequentialAwaits(fn: FunctionInfo, source: string): boolean {
    const lines = source.split('\n');
    const start = Math.max(0, fn.lineNumber - 1);
    const end = Math.min(lines.length, fn.endLineNumber);
    const slice = lines.slice(start, end);
    return slice.filter((l) => l.includes('await')).length >= 2;
  }

  private extractCodeSnippet(
    source: string,
    lineNumber: number,
    contextLines = 3
  ): string {
    const lines = source.split('\n');
    const start = Math.max(0, lineNumber - 1 - contextLines);
    const end = Math.min(lines.length, lineNumber + contextLines);
    return lines.slice(start, end).join('\n');
  }

  private detectReadabilityIssues(
    metadata: CodeMetadata,
    source: string
  ): CodeIssue[] {
    const issues: CodeIssue[] = [];
    for (const fn of metadata.functions) {
      if (fn.bodyLength > 25 || fn.cyclomaticComplexity > 10) {
        issues.push({
          type: 'readability',
          severity: fn.cyclomaticComplexity > 15 ? 'high' : 'medium',
          location: {
            file: metadata.filePath,
            line: fn.lineNumber,
            functionName: fn.name,
          },
          title: 'Long or complex function',
          description: 'Consider splitting into smaller functions.',
          suggestedFix: 'Extract logic into well-named helper functions.',
          codeSnippet: this.extractCodeSnippet(source, fn.lineNumber),
        });
      }
    }
    return issues;
  }

  private detectMaintainabilityIssues(
    metadata: CodeMetadata,
    source: string
  ): CodeIssue[] {
    const issues: CodeIssue[] = [];
    if (metadata.complexity > 50 || metadata.functions.length > 15) {
      issues.push({
        type: 'maintainability',
        severity: 'low',
        location: { file: metadata.filePath, line: 1 },
        title: 'High file complexity',
        description:
          'File has many functions or high cyclomatic complexity. Consider splitting modules.',
        suggestedFix: 'Split into smaller, focused modules.',
        codeSnippet: source.split('\n').slice(0, 5).join('\n'),
      });
    }
    return issues;
  }
}
