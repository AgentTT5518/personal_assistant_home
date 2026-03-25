import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockChat = vi.fn();
const mockList = vi.fn();

vi.mock('ollama', () => ({
  Ollama: class MockOllama {
    static constructorCalls: unknown[] = [];
    chat = mockChat;
    list = mockList;
    constructor(opts: unknown) {
      MockOllama.constructorCalls.push(opts);
    }
  },
}));

vi.mock('../../logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { Ollama } from 'ollama';
import { OllamaProvider } from './ollama.js';

describe('OllamaProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChat.mockReset();
    mockList.mockReset();
    (Ollama as unknown as { constructorCalls: unknown[] }).constructorCalls = [];
    delete process.env.OLLAMA_BASE_URL;
  });

  it('has name "ollama"', () => {
    const provider = new OllamaProvider();
    expect(provider.name).toBe('ollama');
  });

  describe('constructor', () => {
    it('uses default model "llama3"', async () => {
      mockChat.mockResolvedValue({ message: { content: 'ok' } });

      const provider = new OllamaProvider();
      await provider.chat([{ role: 'user', content: 'hi' }]);

      expect(mockChat).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'llama3' }),
      );
    });

    it('uses custom model when provided', async () => {
      mockChat.mockResolvedValue({ message: { content: 'ok' } });

      const provider = new OllamaProvider('mistral');
      await provider.chat([{ role: 'user', content: 'hi' }]);

      expect(mockChat).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'mistral' }),
      );
    });

    it('uses OLLAMA_BASE_URL env when set', () => {
      process.env.OLLAMA_BASE_URL = 'http://remote:11434';
      new OllamaProvider();

      const calls = (Ollama as unknown as { constructorCalls: unknown[] }).constructorCalls;
      expect(calls[0]).toEqual({ host: 'http://remote:11434' });
    });

    it('uses default host when OLLAMA_BASE_URL is not set', () => {
      delete process.env.OLLAMA_BASE_URL;
      new OllamaProvider();

      const calls = (Ollama as unknown as { constructorCalls: unknown[] }).constructorCalls;
      expect(calls[0]).toEqual({ host: 'http://localhost:11434' });
    });
  });

  describe('chat', () => {
    let provider: OllamaProvider;

    beforeEach(() => {
      provider = new OllamaProvider();
    });

    it('sends messages and returns content', async () => {
      mockChat.mockResolvedValue({ message: { content: 'Hello from Ollama!' } });

      const messages = [
        { role: 'system' as const, content: 'Be helpful' },
        { role: 'user' as const, content: 'Hi' },
      ];

      const result = await provider.chat(messages);

      expect(result).toBe('Hello from Ollama!');
      expect(mockChat).toHaveBeenCalledWith({
        model: 'llama3',
        messages: [
          { role: 'system', content: 'Be helpful' },
          { role: 'user', content: 'Hi' },
        ],
        options: {},
      });
    });

    it('passes temperature option when provided', async () => {
      mockChat.mockResolvedValue({ message: { content: 'ok' } });

      await provider.chat(
        [{ role: 'user' as const, content: 'Hi' }],
        { temperature: 0.5 },
      );

      expect(mockChat).toHaveBeenCalledWith({
        model: 'llama3',
        messages: [{ role: 'user', content: 'Hi' }],
        options: { temperature: 0.5 },
      });
    });

    it('does not include temperature when not provided', async () => {
      mockChat.mockResolvedValue({ message: { content: 'ok' } });

      await provider.chat([{ role: 'user' as const, content: 'Hi' }]);

      const callArg = mockChat.mock.calls[0][0];
      expect(callArg.options).toEqual({});
    });

    it('throws and logs on error (Error instance)', async () => {
      const error = new Error('Connection refused');
      mockChat.mockRejectedValue(error);

      await expect(
        provider.chat([{ role: 'user' as const, content: 'Hi' }]),
      ).rejects.toThrow('Connection refused');
    });

    it('throws and logs on error (non-Error)', async () => {
      mockChat.mockRejectedValue('string error');

      await expect(
        provider.chat([{ role: 'user' as const, content: 'Hi' }]),
      ).rejects.toBe('string error');
    });
  });

  describe('isAvailable', () => {
    let provider: OllamaProvider;

    beforeEach(() => {
      provider = new OllamaProvider();
    });

    it('returns true when list() succeeds', async () => {
      mockList.mockResolvedValue({ models: [] });

      const result = await provider.isAvailable();

      expect(result).toBe(true);
      expect(mockList).toHaveBeenCalled();
    });

    it('returns false when list() throws', async () => {
      mockList.mockRejectedValue(new Error('Connection refused'));

      const result = await provider.isAvailable();

      expect(result).toBe(false);
    });
  });
});
