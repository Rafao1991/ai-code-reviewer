// src/ai/providers/claude-provider.ts
import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider } from './base-provider.js';
import { SYSTEM_PROMPT } from '../prompts.js';

export class ClaudeProvider implements AIProvider {
  readonly name = 'Claude';
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(apiKey: string, model: string) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async analyzeCode(prompt: string): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      temperature: 0.3,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    const first = response.content[0];
    if (first?.type === 'text') return first.text;
    throw new Error('Unexpected Claude response: no text content');
  }
}
