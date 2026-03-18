import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider, Message, ChatOptions } from '../types.js';
import { createLogger } from '../../logger.js';

const log = createLogger('ai-claude');

export class ClaudeProvider implements AIProvider {
  name = 'claude';
  private client: Anthropic | null = null;

  private getClient(): Anthropic {
    if (!this.client) {
      this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
    return this.client;
  }

  async chat(messages: Message[], options?: ChatOptions): Promise<string> {
    const client = this.getClient();

    const systemMessages = messages.filter((m) => m.role === 'system');
    const chatMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    try {
      const response = await client.messages.create({
        model: options?.systemPrompt ? 'claude-sonnet-4-5-20250514' : 'claude-sonnet-4-5-20250514',
        max_tokens: options?.maxTokens ?? 4096,
        ...(options?.temperature !== undefined && { temperature: options.temperature }),
        ...(systemMessages.length > 0 && { system: systemMessages.map((m) => m.content).join('\n') }),
        messages: chatMessages,
      });

      const textBlock = response.content.find((block) => block.type === 'text');
      return textBlock?.text ?? '';
    } catch (error) {
      log.error('Claude API call failed', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!process.env.ANTHROPIC_API_KEY;
  }
}
