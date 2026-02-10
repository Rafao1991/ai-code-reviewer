// src/ai/analyzer.ts
import type { Config } from '../config/loader.js';
import type { CodeMetadata, CodeIssue, CodeSnippet } from '../types/index.js';
import { ReviewSchema, type AIReview } from './schemas.js';
import { OllamaProvider } from './providers/ollama-provider.js';
import { ClaudeProvider } from './providers/claude-provider.js';
import { GeminiProvider } from './providers/gemini-provider.js';
import type { AIProvider } from './providers/base-provider.js';
import type { AnalysisCache } from './cache.js';
import { OUTPUT_SCHEMA_INSTRUCTION } from './prompts.js';

export interface AnalysisContext {
  targetCode: string;
  metadata: CodeMetadata;
  detectedIssues: CodeIssue[];
  similarPatterns: CodeSnippet[];
  projectContext?: string;
}

export type AnalysisProgressEvent =
  | { type: 'cache-hit' }
  | { type: 'cache-miss'; provider: string; model: string };

export class AIAnalyzer {
  private readonly provider: AIProvider;
  private readonly providerName: string;
  private readonly model: string;
  private readonly cache?: AnalysisCache;
  private readonly onProgress?: (event: AnalysisProgressEvent) => void;

  constructor(
    config: Config,
    cache?: AnalysisCache,
    providerOverride?: AIProvider,
    onProgress?: (event: AnalysisProgressEvent) => void,
  ) {
    if (providerOverride) {
      this.provider = providerOverride;
      this.providerName = 'mock';
      this.model = 'mock';
    } else {
      const { provider, model } = this.createProvider(config);
      this.provider = provider;
      this.providerName = config.ai.provider;
      this.model = model;
    }
    this.cache = cache;
    this.onProgress = onProgress;
  }

  private createProvider(config: Config): {
    provider: AIProvider;
    model: string;
  } {
    const ai = config.ai;
    switch (ai.provider) {
      case 'ollama': {
        const host = ai.ollama?.host ?? 'http://localhost:11434';
        const model = ai.ollama?.model ?? 'codellama:13b';
        return { provider: new OllamaProvider(host, model), model };
      }
      case 'claude': {
        const apiKey = ai.claude?.apiKey ?? process.env.ANTHROPIC_API_KEY;
        if (!apiKey)
          throw new Error(
            'Claude requires ANTHROPIC_API_KEY or config.ai.claude.apiKey',
          );
        const model = ai.claude?.model ?? 'claude-sonnet-4-5-20250929';
        return { provider: new ClaudeProvider(apiKey, model), model };
      }
      case 'gemini': {
        const apiKey = ai.gemini?.apiKey ?? process.env.GEMINI_API_KEY;
        if (!apiKey)
          throw new Error(
            'Gemini requires GEMINI_API_KEY or config.ai.gemini.apiKey',
          );
        const model = ai.gemini?.model ?? 'gemini-2.0-flash';
        return { provider: new GeminiProvider(apiKey, model), model };
      }
      default:
        throw new Error(`Unknown AI provider: ${ai.provider}`);
    }
  }

  async analyzeCode(context: AnalysisContext): Promise<AIReview> {
    const cacheKey = context.targetCode;
    if (this.cache) {
      const cached = await this.cache.get(
        cacheKey,
        this.providerName,
        this.model,
      );
      if (cached) {
        this.onProgress?.({ type: 'cache-hit' });
        return cached;
      }
    }

    this.onProgress?.({
      type: 'cache-miss',
      provider: this.providerName,
      model: this.model,
    });
    const prompt = this.buildPrompt(context);
    const raw = await this.provider.analyzeCode(prompt);
    const review = this.parseResponse(raw);

    if (this.cache) {
      await this.cache.set(cacheKey, review, this.providerName, this.model);
    }
    return review;
  }

  buildPrompt(context: AnalysisContext): string {
    const { metadata, detectedIssues, similarPatterns, projectContext } =
      context;
    const similarSection = this.formatSimilarPatterns(similarPatterns);
    const issuesSection =
      detectedIssues.length > 0
        ? detectedIssues
            .map(
              (i) =>
                `- [${i.severity}] ${i.title}: ${i.description} (${i.location.file}:${i.location.line})`,
            )
            .join('\n')
        : 'None detected.';

    return `Review the following TypeScript/Node.js code. Analyze it step by step for correctness, performance, readability, and maintainability before producing your final JSON.

=== FILE METADATA ===
File: ${metadata.filePath}
Lines of code: ${metadata.linesOfCode}
Functions: ${metadata.functions.length}
Cyclomatic complexity (sum): ${metadata.complexity}

=== STATIC ANALYSIS (pre-detected) ===
${issuesSection}

=== SIMILAR CODE IN CODEBASE ===
${similarSection}
${projectContext ? `\n=== PROJECT CONTEXT ===\n${projectContext}` : ''}

=== CODE TO REVIEW ===
\`\`\`typescript
${context.targetCode}
\`\`\`

${OUTPUT_SCHEMA_INSTRUCTION}`;
  }

  private formatSimilarPatterns(patterns: CodeSnippet[]): string {
    if (patterns.length === 0) return 'No similar patterns found.';
    return patterns
      .map((p) => {
        const lines = p.code.split('\n').slice(0, 10).join('\n');
        return `--- ${p.functionName} (${p.category}) @ ${p.filePath}
async: ${p.metadata.isAsync}, errorHandling: ${p.metadata.hasErrorHandling}, AWS: ${p.metadata.usesAWS}, complexity: ${p.metadata.complexity}
\`\`\`
${lines}
\`\`\``;
      })
      .join('\n\n');
  }

  parseResponse(text: string): AIReview {
    const codeFence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = codeFence
      ? (codeFence[1] ?? codeFence[0]).trim()
      : text.trim();
    const braceMatch = jsonStr.match(/\{[\s\S]*\}/);
    const toParse = braceMatch ? braceMatch[0] : jsonStr;
    const parsed = JSON.parse(toParse) as unknown;
    return ReviewSchema.parse(parsed);
  }
}
