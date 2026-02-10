// src/config/loader.ts
import { cosmiconfig } from 'cosmiconfig';
import { z } from 'zod';

const ConfigSchema = z.object({
  ai: z.object({
    provider: z.enum(['ollama', 'claude', 'gemini']).default('ollama'),
    ollama: z
      .object({
        host: z.string().default('http://localhost:11434'),
        model: z.string().default('codellama:13b'),
      })
      .optional(),
    claude: z
      .object({
        apiKey: z.string().optional(),
        model: z.string().default('claude-sonnet-4-5-20250929'),
      })
      .optional(),
    gemini: z
      .object({
        apiKey: z.string().optional(),
        model: z.string().default('gemini-2.0-flash'),
      })
      .optional(),
  }),
  rules: z.object({
    performance: z.boolean().default(true),
    readability: z.boolean().default(true),
    maintainability: z.boolean().default(true),
  }),
  ignore: z.array(z.string()).default(['node_modules', 'dist', 'build']),
  indexing: z.object({
    enabled: z.boolean().default(true),
    embeddingModel: z.string().default('voyage-code-2'),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;

export async function loadConfig(): Promise<Config> {
  const explorer = cosmiconfig('codereviewer');
  const result = await explorer.search();
  const raw = (result?.config || {}) as Record<string, unknown>;

  const ai =
    raw.ai && typeof raw.ai === 'object' && !Array.isArray(raw.ai)
      ? (raw.ai as Record<string, unknown>)
      : {};
  const defaults = {
    ai: {
      provider: 'ollama' as const,
      ollama: { host: 'http://localhost:11434', model: 'codellama:13b' },
      claude: { model: 'claude-sonnet-4-5-20250929' },
      gemini: { model: 'gemini-2.0-flash' },
    },
    rules: { performance: true, readability: true, maintainability: true },
    ignore: ['node_modules', 'dist', 'build'],
    indexing: { enabled: true, embeddingModel: 'voyage-code-2' },
  };
  const merged = {
    ...defaults,
    ...raw,
    ai: {
      ...defaults.ai,
      ...ai,
      ...(process.env.ANTHROPIC_API_KEY && {
        claude: {
          ...defaults.ai.claude,
          ...((ai.claude as object) || {}),
          apiKey: process.env.ANTHROPIC_API_KEY,
        },
      }),
      ...(process.env.GEMINI_API_KEY && {
        gemini: {
          ...defaults.ai.gemini,
          ...((ai.gemini as object) || {}),
          apiKey: process.env.GEMINI_API_KEY,
        },
      }),
      ...(process.env.OLLAMA_HOST && {
        ollama: {
          ...defaults.ai.ollama,
          ...((ai.ollama as object) || {}),
          host: process.env.OLLAMA_HOST,
        },
      }),
      ...(process.env.AI_PROVIDER && { provider: process.env.AI_PROVIDER }),
    },
  };

  return ConfigSchema.parse(merged);
}
