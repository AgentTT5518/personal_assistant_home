import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreate = vi.fn();

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      static constructorCalls: unknown[] = [];
      messages = { create: mockCreate };
      constructor(opts: unknown) {
        MockAnthropic.constructorCalls.push(opts);
      }
    },
  };
});

vi.mock('../../logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import Anthropic from '@anthropic-ai/sdk';
import { ClaudeProvider } from './claude.js';

describe('ClaudeProvider', () => {
  let provider: ClaudeProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockReset();
    (Anthropic as unknown as { constructorCalls: unknown[] }).constructorCalls = [];
    provider = new ClaudeProvider();
    delete process.env.ANTHROPIC_API_KEY;
  });

  it('has name "claude"', () => {
    expect(provider.name).toBe('claude');
  });

  describe('getClient (lazy initialization)', () => {
    it('creates Anthropic client on first call and reuses it', async () => {
      process.env.ANTHROPIC_API_KEY = 'test-key';

      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'response1' }],
      });

      const messages = [{ role: 'user' as const, content: 'hello' }];

      await provider.chat(messages);
      await provider.chat(messages);

      // Anthropic constructor should be called only once (lazy + reuse)
      const calls = (Anthropic as unknown as { constructorCalls: unknown[] }).constructorCalls;
      expect(calls).toHaveLength(1);
      expect(calls[0]).toEqual({ apiKey: 'test-key' });
    });
  });

  describe('chat', () => {
    beforeEach(() => {
      process.env.ANTHROPIC_API_KEY = 'test-key';
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Hello there!' }],
      });
    });

    it('sends messages correctly, filters system messages, and returns text', async () => {
      const messages = [
        { role: 'user' as const, content: 'Hi' },
        { role: 'assistant' as const, content: 'Hello' },
        { role: 'user' as const, content: 'How are you?' },
      ];

      const result = await provider.chat(messages);

      expect(result).toBe('Hello there!');
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'claude-sonnet-4-5-20250514',
        max_tokens: 4096,
        messages: [
          { role: 'user', content: 'Hi' },
          { role: 'assistant', content: 'Hello' },
          { role: 'user', content: 'How are you?' },
        ],
      });
    });

    it('applies temperature and maxTokens options', async () => {
      const messages = [{ role: 'user' as const, content: 'Hi' }];

      await provider.chat(messages, { temperature: 0.7, maxTokens: 1024 });

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'claude-sonnet-4-5-20250514',
        max_tokens: 1024,
        temperature: 0.7,
        messages: [{ role: 'user', content: 'Hi' }],
      });
    });

    it('joins system messages into system parameter', async () => {
      const messages = [
        { role: 'system' as const, content: 'You are helpful.' },
        { role: 'system' as const, content: 'Be concise.' },
        { role: 'user' as const, content: 'Hi' },
      ];

      await provider.chat(messages);

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'claude-sonnet-4-5-20250514',
        max_tokens: 4096,
        system: 'You are helpful.\nBe concise.',
        messages: [{ role: 'user', content: 'Hi' }],
      });
    });

    it('returns empty string when no text block in response', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'tool_use', id: 'tool1', name: 'test', input: {} }],
      });

      const result = await provider.chat([{ role: 'user' as const, content: 'Hi' }]);

      expect(result).toBe('');
    });

    it('throws and logs error on API failure', async () => {
      const apiError = new Error('API rate limit exceeded');
      mockCreate.mockRejectedValue(apiError);

      await expect(
        provider.chat([{ role: 'user' as const, content: 'Hi' }]),
      ).rejects.toThrow('API rate limit exceeded');
    });

    it('throws and logs when error is not an Error instance', async () => {
      mockCreate.mockRejectedValue('string error');

      await expect(
        provider.chat([{ role: 'user' as const, content: 'Hi' }]),
      ).rejects.toBe('string error');
    });

    it('does not include temperature when not provided', async () => {
      const messages = [{ role: 'user' as const, content: 'Hi' }];

      await provider.chat(messages, { maxTokens: 2048 });

      const callArg = mockCreate.mock.calls[0][0];
      expect(callArg).not.toHaveProperty('temperature');
      expect(callArg.max_tokens).toBe(2048);
    });

    it('does not include system when no system messages', async () => {
      const messages = [{ role: 'user' as const, content: 'Hi' }];

      await provider.chat(messages);

      const callArg = mockCreate.mock.calls[0][0];
      expect(callArg).not.toHaveProperty('system');
    });
  });

  describe('isAvailable', () => {
    it('returns true when ANTHROPIC_API_KEY is set', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-test-key';
      expect(await provider.isAvailable()).toBe(true);
    });

    it('returns false when ANTHROPIC_API_KEY is not set', async () => {
      delete process.env.ANTHROPIC_API_KEY;
      expect(await provider.isAvailable()).toBe(false);
    });

    it('returns false when ANTHROPIC_API_KEY is empty string', async () => {
      process.env.ANTHROPIC_API_KEY = '';
      expect(await provider.isAvailable()).toBe(false);
    });
  });
});
