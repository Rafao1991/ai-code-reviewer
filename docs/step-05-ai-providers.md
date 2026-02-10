# Step 5: AI Provider Layer – Implementation Summary

This document describes what was implemented in Step 5 and how to use it.

## What Was Done

### 1. Base provider (`src/ai/providers/base-provider.ts`)

- **AIProvider** interface: `name`, `analyzeCode(prompt): Promise<string>`

### 2. Ollama provider (`src/ai/providers/ollama-provider.ts`)

- **OllamaProvider** – host, model
- **analyzeCode** – chat with format JSON, temperature 0.3, num_predict 4096
- **healthCheck()** – `client.list()`; returns true/false
- **isModelAvailable()** – checks model in list

### 3. Claude provider (`src/ai/providers/claude-provider.ts`)

- **ClaudeProvider** – apiKey, model
- **analyzeCode** – messages.create with system prompt, max_tokens 4096, temperature 0.3

### 4. Gemini provider (`src/ai/providers/gemini-provider.ts`)

- **GeminiProvider** – apiKey, model
- **analyzeCode** – generateContent with systemInstruction, responseMimeType: 'application/json'

### 5. Prompts (`src/ai/prompts.ts`)

- **SYSTEM_PROMPT** – system-role persona, review guidelines, severity rubric, constraints
- **OUTPUT_SCHEMA_INSTRUCTION** – full JSON schema with field descriptions, reused in the user prompt

### 6. Schemas (`src/ai/schemas.ts`)

- **ReviewItemSchema** – severity, title, explanation, location, suggestion, example?
- **ReviewSchema** – summary, performanceIssues, readabilityIssues, maintainabilityIssues, positives
- **AIReview** = z.infer<typeof ReviewSchema>

### 7. AI Analyzer (`src/ai/analyzer.ts`)

- **AnalysisContext** – targetCode, metadata, detectedIssues, similarPatterns, projectContext?
- **AIAnalyzer** – createProvider from config, analyzeCode(context), buildPrompt, formatSimilarPatterns, parseResponse
- Optional **AnalysisCache** – get/set by code hash, provider, model

### 8. Provider fallback (documented)

If Ollama fails (healthCheck or isModelAvailable) and another provider is configured:

1. Try Gemini if GEMINI_API_KEY is set
2. Else try Claude if ANTHROPIC_API_KEY is set
3. Otherwise throw with a clear message

Implementation can live in the CLI (Step 6) when invoking the analyzer: try/catch and retry with next provider.

---

## Prompt Design

The prompt is split into two parts that work together: a **system prompt** (sent as the system/instruction role) and a **user prompt** (built per-analysis by `AIAnalyzer.buildPrompt`). This design targets broad compatibility across local models (codellama, deepseek-coder via Ollama) and cloud APIs (Claude, Gemini).

### System prompt (`SYSTEM_PROMPT`)

Sets the persona, review principles, severity rubric, and constraints. It is sent once per request as the "system" role.

**Key sections and why:**

| Section | Purpose |
|---------|---------|
| Role ("expert code reviewer for TypeScript and Node.js") | Gives the model a clear persona without over-constraining to a niche like AWS Lambda |
| Review principles (actionable, evidence-based, proportional, constructive) | Tells the model *how* to review, not just *what* to review |
| Severity rubric (high/medium/low with concrete examples) | Eliminates the most common inconsistency: models guessing what "high" means. Without this, smaller models assign random severities |
| Constraints ("do NOT invent issues", "do NOT flag style nits") | Single highest-impact section for reducing hallucinated issues and noise, especially on local models |
| JSON-only output instruction | First mention of format; reinforced again in the user prompt |

### User prompt (`buildPrompt` in `AIAnalyzer`)

Built per-file with concrete context. Uses `=== SECTION ===` delimiters (more reliable across models than markdown headers).

**Structure:**

1. **Task instruction** -- "Review... Analyze step by step before producing your final JSON." The chain-of-thought trigger improves reasoning quality on all models without requiring explicit CoT output.

2. **File metadata** -- path, LOC, function count, cyclomatic complexity. Gives the model quantitative context before it sees the code.

3. **Static analysis results** -- pre-detected issues from PatternDetector. Prevents the AI from re-discovering what static analysis already found, and lets it focus on deeper issues.

4. **Similar codebase patterns** -- snippets from the index. Enables "consistency with codebase" suggestions.

5. **Code block** -- the actual code to review, in a fenced typescript block.

6. **`OUTPUT_SCHEMA_INSTRUCTION`** -- full JSON schema with placeholder values and field-level rules. Acts as a one-shot example. This is the most important section for format compliance on smaller models.

### Why the schema appears twice

The JSON format instruction appears in both the system prompt (briefly) and the user prompt (in full via `OUTPUT_SCHEMA_INSTRUCTION`). Smaller models tend to forget system prompt instructions mid-generation, so reinforcing the schema at the end of the user prompt -- right before the model starts generating -- significantly improves format compliance.

### Temperature and token settings

All providers use `temperature: 0.3` (low randomness for consistent, deterministic reviews) and 4096 max output tokens (enough for detailed reviews without runaway generation).

---

## How to Use

### Programmatic

```typescript
import { loadConfig } from './config/loader.js';
import { AIAnalyzer } from './ai/analyzer.js';
import { AnalysisCache } from './ai/cache.js';

const config = await loadConfig();
const cache = new AnalysisCache();
const analyzer = new AIAnalyzer(config, cache);

const review = await analyzer.analyzeCode({
  targetCode: 'async function x() { await a(); await b(); }',
  metadata: { filePath: 'x.ts', functions: [], classes: [], imports: [], complexity: 1, linesOfCode: 5 },
  detectedIssues: [],
  similarPatterns: [],
});
console.log(review.summary, review.performanceIssues);
```

### Providers

- **Ollama** – requires Ollama running; config `ai.provider: 'ollama'`, `ai.ollama.host`, `ai.ollama.model`
- **Claude** – requires ANTHROPIC_API_KEY; config `ai.provider: 'claude'`
- **Gemini** – requires GEMINI_API_KEY; config `ai.provider: 'gemini'`

---

## Verification

- [x] OllamaProvider.analyzeCode returns string (JSON)
- [x] ClaudeProvider.analyzeCode returns string
- [x] GeminiProvider.analyzeCode returns string
- [x] parseResponse + ReviewSchema.parse produce valid AIReview
- [x] AIAnalyzer with config produces result (cache optional)
