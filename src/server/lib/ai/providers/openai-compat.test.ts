import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreate = vi.fn();

vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      static constructorCalls: unknown[] = [];
      chat = { completions: { create: mockCreate } };
      constructor(opts: unknown) {
        MockOpenAI.constructorCalls.push(opts);
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

import OpenAI from 'openai';
import { OpenAICompatProvider } from './openai-compat.js';

describe('OpenAICompatProvider', () => {
  let provider: OpenAICompatProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockReset();
    (OpenAI as unknown as { constructorCalls: unknown[] }).constructorCalls = [];
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_BASE_URL;
    provider = new OpenAICompatProvider();
  });

  it('has name "openai_compat"', () => {
    expect(provider.name).toBe('openai_compat');
  });

  describe('constructor', () => {
    it('uses default model "gpt-4o"', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'ok' } }],
      });

      provider = new OpenAICompatProvider();
      await provider.chat([{ role: 'user', content: 'Hi' }]);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'gpt-4o' }),
      );
    });

    it('uses custom model when provided', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'ok' } }],
      });

      provider = new OpenAICompatProvider('gpt-3.5-turbo');
      await provider.chat([{ role: 'user', content: 'Hi' }]);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'gpt-3.5-turbo' }),
      );
    });
  });

  describe('getClient (lazy initialization)', () => {
    it('creates OpenAI client lazily and reuses it', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'ok' } }],
      });

      provider = new OpenAICompatProvider();
      await provider.chat([{ role: 'user', content: 'Hi' }]);
      await provider.chat([{ role: 'user', content: 'Hi again' }]);

      const calls = (OpenAI as unknown as { constructorCalls: unknown[] }).constructorCalls;
      expect(calls).toHaveLength(1);
    });

    it('uses OPENAI_BASE_URL env when set', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      process.env.OPENAI_BASE_URL = 'https://custom.api.com/v1';
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'ok' } }],
      });

      provider = new OpenAICompatProvider();
      await provider.chat([{ role: 'user', content: 'Hi' }]);

      const calls = (OpenAI as unknown as { constructorCalls: unknown[] }).constructorCalls;
      expect(calls[0]).toEqual({
        apiKey: 'test-key',
        baseURL: 'https://custom.api.com/v1',
      });
    });

    it('uses default base URL when OPENAI_BASE_URL is not set', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      delete process.env.OPENAI_BASE_URL;
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'ok' } }],
      });

      provider = new OpenAICompatProvider();
      await provider.chat([{ role: 'user', content: 'Hi' }]);

      const calls = (OpenAI as unknown as { constructorCalls: unknown[] }).constructorCalls;
      expect(calls[0]).toEqual({
        apiKey: 'test-key',
        baseURL: 'https://api.openai.com/v1',
      });
    });
  });

  describe('chat', () => {
    beforeEach(() => {
      process.env.OPENAI_API_KEY = 'test-key';
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'Hello from OpenAI!' } }],
      });
    });

    it('sends messages and returns content', async () => {
      const messages = [
        { role: 'system' as const, content: 'Be helpful' },
        { role: 'user' as const, content: 'Hi' },
      ];

      const result = await provider.chat(messages);

      expect(result).toBe('Hello from OpenAI!');
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4o',
        max_tokens: 4096,
        messages: [
          { role: 'system', content: 'Be helpful' },
          { role: 'user', content: 'Hi' },
        ],
      });
    });

    it('applies temperature and maxTokens options', async () => {
      await provider.chat(
        [{ role: 'user' as const, content: 'Hi' }],
        { temperature: 0.8, maxTokens: 2048 },
      );

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4o',
        max_tokens: 2048,
        temperature: 0.8,
        messages: [{ role: 'user', content: 'Hi' }],
      });
    });

    it('does not include temperature when not provided', async () => {
      await provider.chat([{ role: 'user' as const, content: 'Hi' }]);

      const callArg = mockCreate.mock.calls[0][0];
      expect(callArg).not.toHaveProperty('temperature');
    });

    it('returns empty string when choices array is empty', async () => {
      mockCreate.mockResolvedValue({ choices: [] });

      const result = await provider.chat([{ role: 'user' as const, content: 'Hi' }]);

      expect(result).toBe('');
    });

    it('returns empty string when message content is null', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: null } }],
      });

      const result = await provider.chat([{ role: 'user' as const, content: 'Hi' }]);

      expect(result).toBe('');
    });

    it('throws and logs on error (Error instance)', async () => {
      const error = new Error('API key invalid');
      mockCreate.mockRejectedValue(error);

      await expect(
        provider.chat([{ role: 'user' as const, content: 'Hi' }]),
      ).rejects.toThrow('API key invalid');
    });

    it('throws and logs on error (non-Error)', async () => {
      mockCreate.mockRejectedValue('string error');

      await expect(
        provider.chat([{ role: 'user' as const, content: 'Hi' }]),
      ).rejects.toBe('string error');
    });
  });

  describe('isAvailable', () => {
    it('returns true when OPENAI_API_KEY is set', async () => {
      process.env.OPENAI_API_KEY = 'test-api-key-123';
      expect(await provider.isAvailable()).toBe(true);
    });

    it('returns false when OPENAI_API_KEY is not set', async () => {
      delete process.env.OPENAI_API_KEY;
      expect(await provider.isAvailable()).toBe(false);
    });

    it('returns false when OPENAI_API_KEY is empty string', async () => {
      process.env.OPENAI_API_KEY = '';
      expect(await provider.isAvailable()).toBe(false);
    });
  });
});
