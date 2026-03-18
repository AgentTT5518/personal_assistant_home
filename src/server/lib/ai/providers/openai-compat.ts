import OpenAI from 'openai';
import type { AIProvider, Message, ChatOptions } from '../types.js';
import { createLogger } from '../../logger.js';

const log = createLogger('ai-openai-compat');

export class OpenAICompatProvider implements AIProvider {
  name = 'openai_compat';
  private client: OpenAI | null = null;
  private defaultModel: string;

  constructor(model = 'gpt-4o') {
    this.defaultModel = model;
  }

  private getClient(): OpenAI {
    if (!this.client) {
      this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      });
    }
    return this.client;
  }

  async chat(messages: Message[], options?: ChatOptions): Promise<string> {
    const client = this.getClient();

    try {
      const response = await client.chat.completions.create({
        model: this.defaultModel,
        max_tokens: options?.maxTokens ?? 4096,
        ...(options?.temperature !== undefined && { temperature: options.temperature }),
        messages: messages.map((m) => ({
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
        })),
      });

      return response.choices[0]?.message?.content ?? '';
    } catch (error) {
      log.error('OpenAI-compat call failed', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!process.env.OPENAI_API_KEY;
  }
}
