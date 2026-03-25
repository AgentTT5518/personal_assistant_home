import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock provider instances
const mockClaudeChat = vi.fn();
const mockClaudeIsAvailable = vi.fn();
const mockOllamaChat = vi.fn();
const mockOllamaIsAvailable = vi.fn();
const mockOpenAIChat = vi.fn();
const mockOpenAIIsAvailable = vi.fn();

vi.mock('./providers/claude.js', () => ({
  ClaudeProvider: class MockClaudeProvider {
    name = 'claude';
    chat = mockClaudeChat;
    isAvailable = mockClaudeIsAvailable;
  },
}));

vi.mock('./providers/ollama.js', () => ({
  OllamaProvider: class MockOllamaProvider {
    name = 'ollama';
    chat = mockOllamaChat;
    isAvailable = mockOllamaIsAvailable;
    constructor(public model?: string) {}
  },
}));

vi.mock('./providers/openai-compat.js', () => ({
  OpenAICompatProvider: class MockOpenAICompatProvider {
    name = 'openai_compat';
    chat = mockOpenAIChat;
    isAvailable = mockOpenAIIsAvailable;
    constructor(public model?: string) {}
  },
}));

const mockGet = vi.fn();

vi.mock('../db/index.js', () => {
  const chainable = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnValue({
      get: (...args: unknown[]) => mockGet(...args),
    }),
  };
  return {
    db: chainable,
    schema: {
      aiSettings: { taskType: 'task_type' },
    },
  };
});

vi.mock('../logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { routeToProvider } from './router.js';
import type { TaskType } from '../../../shared/types/index.js';

describe('routeToProvider', () => {
  const taskType: TaskType = 'pdf_extraction';
  const messages = [{ role: 'user' as const, content: 'Extract this' }];

  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockReset();
  });

  it('throws when no settings found for task type', async () => {
    mockGet.mockReturnValue(undefined);

    await expect(routeToProvider(taskType, messages)).rejects.toThrow(
      'No AI settings configured for task type: pdf_extraction',
    );
  });

  it('routes to claude provider when available', async () => {
    mockGet.mockReturnValue({
      provider: 'claude',
      model: 'claude-sonnet-4-5-20250514',
      fallbackProvider: null,
      fallbackModel: null,
    });
    mockClaudeIsAvailable.mockResolvedValue(true);
    mockClaudeChat.mockResolvedValue('Claude response');

    const result = await routeToProvider(taskType, messages);

    expect(result).toBe('Claude response');
    expect(mockClaudeChat).toHaveBeenCalledWith(messages, undefined);
  });

  it('routes to ollama provider when available', async () => {
    mockGet.mockReturnValue({
      provider: 'ollama',
      model: 'llama3',
      fallbackProvider: null,
      fallbackModel: null,
    });
    mockOllamaIsAvailable.mockResolvedValue(true);
    mockOllamaChat.mockResolvedValue('Ollama response');

    const result = await routeToProvider(taskType, messages);

    expect(result).toBe('Ollama response');
    expect(mockOllamaChat).toHaveBeenCalledWith(messages, undefined);
  });

  it('routes to openai_compat provider when available', async () => {
    mockGet.mockReturnValue({
      provider: 'openai_compat',
      model: 'gpt-4o',
      fallbackProvider: null,
      fallbackModel: null,
    });
    mockOpenAIIsAvailable.mockResolvedValue(true);
    mockOpenAIChat.mockResolvedValue('OpenAI response');

    const result = await routeToProvider(taskType, messages);

    expect(result).toBe('OpenAI response');
    expect(mockOpenAIChat).toHaveBeenCalledWith(messages, undefined);
  });

  it('passes options through to provider chat', async () => {
    mockGet.mockReturnValue({
      provider: 'claude',
      model: 'claude-sonnet-4-5-20250514',
      fallbackProvider: null,
      fallbackModel: null,
    });
    mockClaudeIsAvailable.mockResolvedValue(true);
    mockClaudeChat.mockResolvedValue('response');

    const options = { temperature: 0.5, maxTokens: 1024 };
    await routeToProvider(taskType, messages, options);

    expect(mockClaudeChat).toHaveBeenCalledWith(messages, options);
  });

  it('throws for unknown provider', async () => {
    mockGet.mockReturnValue({
      provider: 'unknown_provider',
      model: 'some-model',
      fallbackProvider: null,
      fallbackModel: null,
    });

    await expect(routeToProvider(taskType, messages)).rejects.toThrow(
      'Unknown AI provider: unknown_provider',
    );
  });

  it('falls back to secondary provider when primary is unavailable', async () => {
    mockGet.mockReturnValue({
      provider: 'claude',
      model: 'claude-sonnet-4-5-20250514',
      fallbackProvider: 'ollama',
      fallbackModel: 'llama3',
    });
    mockClaudeIsAvailable.mockResolvedValue(false);
    mockOllamaIsAvailable.mockResolvedValue(true);
    mockOllamaChat.mockResolvedValue('Fallback response');

    const result = await routeToProvider(taskType, messages);

    expect(result).toBe('Fallback response');
    expect(mockClaudeIsAvailable).toHaveBeenCalled();
    expect(mockOllamaChat).toHaveBeenCalledWith(messages, undefined);
  });

  it('throws when both primary and fallback are unavailable', async () => {
    mockGet.mockReturnValue({
      provider: 'claude',
      model: 'claude-sonnet-4-5-20250514',
      fallbackProvider: 'ollama',
      fallbackModel: 'llama3',
    });
    mockClaudeIsAvailable.mockResolvedValue(false);
    mockOllamaIsAvailable.mockResolvedValue(false);

    await expect(routeToProvider(taskType, messages)).rejects.toThrow(
      'AI provider "claude" is not available for task "pdf_extraction" and no fallback is configured.',
    );
  });

  it('throws when primary is unavailable and no fallback configured', async () => {
    mockGet.mockReturnValue({
      provider: 'claude',
      model: 'claude-sonnet-4-5-20250514',
      fallbackProvider: null,
      fallbackModel: null,
    });
    mockClaudeIsAvailable.mockResolvedValue(false);

    await expect(routeToProvider(taskType, messages)).rejects.toThrow(
      'AI provider "claude" is not available for task "pdf_extraction" and no fallback is configured.',
    );
  });

  it('throws when primary is unavailable and only fallbackProvider is set (no model)', async () => {
    mockGet.mockReturnValue({
      provider: 'claude',
      model: 'claude-sonnet-4-5-20250514',
      fallbackProvider: 'ollama',
      fallbackModel: null,
    });
    mockClaudeIsAvailable.mockResolvedValue(false);

    await expect(routeToProvider(taskType, messages)).rejects.toThrow(
      'AI provider "claude" is not available for task "pdf_extraction" and no fallback is configured.',
    );
  });

  it('throws for unknown fallback provider', async () => {
    mockGet.mockReturnValue({
      provider: 'claude',
      model: 'claude-sonnet-4-5-20250514',
      fallbackProvider: 'unknown_fallback',
      fallbackModel: 'some-model',
    });
    mockClaudeIsAvailable.mockResolvedValue(false);

    await expect(routeToProvider(taskType, messages)).rejects.toThrow(
      'Unknown AI provider: unknown_fallback',
    );
  });
});
