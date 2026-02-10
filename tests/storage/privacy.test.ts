import { describe, it, expect } from 'vitest';
import {
  PrivacyManager,
  anonymizePath,
  removeLiterals,
} from '../../src/storage/privacy.js';
import type { CodeSnippet } from '../../src/types/index.js';

describe('PrivacyManager', () => {
  const manager = new PrivacyManager();

  it('sanitizeForSharing anonymizes path and removes literals', () => {
    const snippet: CodeSnippet = {
      id: '1',
      filePath: '/home/user/projects/app/utils.ts',
      functionName: 'fn',
      code: 'const key = "abc123"; const url = \'https://api.example.com\';',
      category: 'util',
      metadata: { isAsync: false, hasErrorHandling: false, usesAWS: false, complexity: 1 },
    };
    const out = manager.sanitizeForSharing(snippet);
    expect(out.filePath).toBe('projects/app/utils.ts');
    expect(out.code).toContain('"***"');
    expect(out.code).toContain("'***'");
  });
});

describe('anonymizePath', () => {
  it('returns last 3 path parts', () => {
    expect(anonymizePath('a/b/c/d/e/f.ts')).toBe('d/e/f.ts');
  });

  it('handles single part', () => {
    expect(anonymizePath('file.ts')).toBe('file.ts');
  });
});

describe('removeLiterals', () => {
  it('replaces double-quoted strings', () => {
    expect(removeLiterals('const x = "hello";')).toBe('const x = "***";');
  });

  it('replaces single-quoted strings', () => {
    expect(removeLiterals("const x = 'world';")).toBe("const x = '***';");
  });

  it('replaces template literals', () => {
    expect(removeLiterals('const x = `foo`;')).toBe('const x = `***`;');
  });
});
