import type { Message, ChatOptions } from '../../../shared/types/index.js';

export interface AIProvider {
  name: string;
  chat(messages: Message[], options?: ChatOptions): Promise<string>;
  isAvailable(): Promise<boolean>;
}

export type { Message, ChatOptions };
