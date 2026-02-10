// src/storage/privacy.ts
import type { CodeSnippet } from '../types/index.js';

export class PrivacyManager {
  sanitizeForSharing(snippet: CodeSnippet): CodeSnippet {
    return {
      ...snippet,
      filePath: anonymizePath(snippet.filePath),
      code: removeLiterals(snippet.code),
    };
  }
}

export function anonymizePath(path: string): string {
  const parts = path.split(/[/\\]/);
  return parts.slice(-3).join('/');
}

export function removeLiterals(code: string): string {
  return code
    .replace(/"[^"]*"/g, '"***"')
    .replace(/'[^']*'/g, "'***'")
    .replace(/`[^`]*`/g, '`***`');
}
