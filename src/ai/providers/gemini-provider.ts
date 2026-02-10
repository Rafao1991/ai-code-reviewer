// src/ai/providers/gemini-provider.ts
import { GoogleGenAI } from '@google/genai';
import type { AIProvider } from './base-provider.js';
import { SYSTEM_PROMPT } from '../prompts.js';

export class GeminiProvider implements AIProvider {
  readonly name = 'Gemini';
  private readonly ai: GoogleGenAI;
  private readonly model: string;

  constructor(apiKey: string, model: string) {
    this.ai = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  async analyzeCode(prompt: string): Promise<string> {
    const response = await this.ai.models.generateContent({
      model: this.model,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.3,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
      },
    });

    return response.text ?? '';
  }
}
