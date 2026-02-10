// src/indexer/codebase-indexer.ts
import { readFile } from 'node:fs/promises';
import fg from 'fast-glob';
import { TypeScriptAnalyzer } from '../analyzer/ts-parser.js';
import type {
  CodeSnippet,
  SnippetCategory,
  FunctionInfo,
  CodeMetadata,
} from '../types/index.js';

export class CodebaseIndexer {
  private snippets: CodeSnippet[] = [];
  private readonly ignorePatterns: string[];
  private readonly analyzer = new TypeScriptAnalyzer();

  constructor(ignorePatterns: string[] = []) {
    this.ignorePatterns = ignorePatterns.flatMap((p) => [
      `**/${p}/**`,
      `**/${p}`,
    ]);
  }

  async indexCodebase(rootPath: string): Promise<CodeSnippet[]> {
    this.snippets = [];
    const files = await fg('**/*.ts', {
      cwd: rootPath,
      absolute: true,
      ignore: this.ignorePatterns,
    });
    for (const filePath of files) {
      const snippets = await this.indexFile(filePath);
      this.snippets.push(...snippets);
    }
    return this.snippets;
  }

  async indexFile(filePath: string): Promise<CodeSnippet[]> {
    const [metadata, sourceCode] = await Promise.all([
      this.analyzer.analyzeFile(filePath),
      readFile(filePath, 'utf-8'),
    ]);
    return this.extractSnippets(metadata, sourceCode);
  }

  private extractSnippets(
    metadata: CodeMetadata,
    sourceCode: string,
  ): CodeSnippet[] {
    const snippets: CodeSnippet[] = [];
    for (const fn of metadata.functions) {
      if (fn.bodyLength < 5) continue;
      const code = extractFunctionCode(sourceCode, fn);
      const category = categorizeSnippet(metadata.filePath, code);
      snippets.push({
        id: `${metadata.filePath}:${fn.name}:${fn.lineNumber}`,
        filePath: metadata.filePath,
        functionName: fn.name,
        code,
        category,
        metadata: {
          isAsync: fn.isAsync,
          hasErrorHandling: code.includes('try') && code.includes('catch'),
          usesAWS:
            code.includes('AWS') ||
            code.includes('@aws-sdk') ||
            code.includes('aws-sdk'),
          complexity: fn.cyclomaticComplexity,
        },
      });
    }
    return snippets;
  }

  getSnippets(): CodeSnippet[] {
    return [...this.snippets];
  }

  findSimilarPatterns(
    targetCode: string,
    limit = 5,
    snippets: CodeSnippet[] = this.snippets,
  ): CodeSnippet[] {
    const keywords = extractKeywords(targetCode);
    if (keywords.size === 0) return [];

    const scored = snippets
      .map((s) => ({
        snippet: s,
        score: countKeywordOverlap(keywords, s.code),
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ snippet }) => snippet);

    return scored;
  }
}

function extractFunctionCode(source: string, fn: FunctionInfo): string {
  const lines = source.split('\n');
  const start = Math.max(0, fn.lineNumber - 1);
  const end = Math.min(lines.length, fn.endLineNumber);
  return lines.slice(start, end).join('\n');
}

function categorizeSnippet(filePath: string, _code: string): SnippetCategory {
  const lower = filePath.toLowerCase();
  if (lower.includes('controller')) return 'controller';
  if (lower.includes('service')) return 'service';
  if (lower.includes('repository')) return 'repository';
  if (lower.includes('middleware')) return 'middleware';
  return 'util';
}

function extractKeywords(code: string): Set<string> {
  const keywords = new Set<string>();
  const importRe = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
  const callRe = /(\w+)\s*\(/g;
  let m;
  while ((m = importRe.exec(code))) keywords.add(m[1]);
  while ((m = callRe.exec(code))) keywords.add(m[1]);
  return keywords;
}

function countKeywordOverlap(keywords: Set<string>, code: string): number {
  let count = 0;
  for (const kw of keywords) {
    if (code.includes(kw)) count += 1;
  }
  return count;
}
