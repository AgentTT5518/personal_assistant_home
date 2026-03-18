import { Ollama } from 'ollama';
import type { AIProvider, Message, ChatOptions } from '../types.js';
import { createLogger } from '../../logger.js';

const log = createLogger('ai-ollama');

export class OllamaProvider implements AIProvider {
  name = 'ollama';
  private client: Ollama;
  private defaultModel: string;

  constructor(model = 'llama3') {
    this.client = new Ollama({
      host: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    });
    this.defaultModel = model;
  }

  async chat(messages: Message[], options?: ChatOptions): Promise<string> {
    try {
      const response = await this.client.chat({
        model: this.defaultModel,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        options: {
          ...(options?.temperature !== undefined && { temperature: options.temperature }),
        },
      });

      return response.message.content;
    } catch (error) {
      log.error('Ollama call failed', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.list();
      return true;
    } catch {
      return false;
    }
  }
}
