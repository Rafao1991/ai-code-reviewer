// src/ai/providers/base-provider.ts
/**
 * Base interface for AI providers. All providers return raw response text (typically JSON).
 * AIReview and ReviewItem are defined in ../../types/index.js.
 */
export interface AIProvider {
  readonly name: string;
  analyzeCode(prompt: string): Promise<string>;
}
