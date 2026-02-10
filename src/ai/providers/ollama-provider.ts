// src/ai/providers/ollama-provider.ts
import { Ollama } from 'ollama';
import type { AIProvider } from './base-provider.js';
import { SYSTEM_PROMPT } from '../prompts.js';

export class OllamaProvider implements AIProvider {
  readonly name = 'Ollama';
  private readonly client: InstanceType<typeof Ollama>;
  private readonly model: string;

  constructor(host: string, model: string) {
    this.client = new Ollama({ host });
    this.model = model;
  }

  async analyzeCode(prompt: string): Promise<string> {
    const response = await this.client.chat({
      model: this.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      format: 'json',
      options: { temperature: 0.3, num_predict: 4096 },
    });

    const content = response.message.content as string | unknown[];
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content
        .map((c: unknown) =>
          typeof c === 'string' ? c : ((c as { text?: string })?.text ?? ''),
        )
        .join('');
    }
    return String(content ?? '');
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.list();
      return true;
    } catch {
      return false;
    }
  }

  async isModelAvailable(): Promise<boolean> {
    try {
      const { models } = await this.client.list();
      return models.some(
        (m) => m.name === this.model || m.name.startsWith(this.model + ':'),
      );
    } catch {
      return false;
    }
  }

  async listModels(): Promise<
    { name: string; size: number; modifiedAt: Date }[]
  > {
    const { models } = await this.client.list();
    return models.map((m) => ({
      name: m.name,
      size: m.size ?? 0,
      modifiedAt: m.modified_at ? new Date(m.modified_at) : new Date(),
    }));
  }
}
