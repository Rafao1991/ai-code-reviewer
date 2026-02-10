// src/types/index.ts
// Shared interfaces used by analyzer, indexer, AI, and reporter.

export interface FunctionInfo {
  name: string;
  lineNumber: number;
  endLineNumber: number;
  parameters: string[];
  returnType: string;
  isAsync: boolean;
  bodyLength: number;
  cyclomaticComplexity: number;
}

export interface ClassInfo {
  name: string;
  lineNumber: number;
  methods: string[];
  isExported: boolean;
}

export interface ImportInfo {
  moduleSpecifier: string;
  namedImports: string[];
  defaultImport?: string;
  lineNumber: number;
}

export interface CodeMetadata {
  filePath: string;
  functions: FunctionInfo[];
  classes: ClassInfo[];
  imports: ImportInfo[];
  complexity: number;
  linesOfCode: number;
}

export interface CodeIssue {
  type: 'performance' | 'readability' | 'maintainability';
  severity: 'high' | 'medium' | 'low';
  location: {
    file: string;
    line: number;
    functionName?: string;
  };
  title: string;
  description: string;
  suggestedFix?: string;
  codeSnippet: string;
}

export type SnippetCategory =
  | 'service'
  | 'controller'
  | 'repository'
  | 'util'
  | 'middleware';

export interface CodeSnippet {
  id: string;
  filePath: string;
  functionName: string;
  code: string;
  category: SnippetCategory;
  metadata: {
    isAsync: boolean;
    hasErrorHandling: boolean;
    usesAWS: boolean;
    complexity: number;
  };
}

export interface ReviewItem {
  severity: 'high' | 'medium' | 'low';
  title: string;
  explanation: string;
  location: { line: number; snippet: string };
  suggestion: string;
  example?: string;
}

export interface AIReview {
  summary: string;
  performanceIssues: ReviewItem[];
  readabilityIssues: ReviewItem[];
  maintainabilityIssues: ReviewItem[];
  positives: string[];
}
