import { eq } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import type { AIProvider, Message, ChatOptions } from './types.js';
import { ClaudeProvider } from './providers/claude.js';
import { OllamaProvider } from './providers/ollama.js';
import { OpenAICompatProvider } from './providers/openai-compat.js';
import type { TaskType } from '../../../shared/types/index.js';
import { createLogger } from '../logger.js';

const log = createLogger('ai-router');

function createProvider(provider: string, model: string): AIProvider {
  switch (provider) {
    case 'claude':
      return new ClaudeProvider();
    case 'ollama':
      return new OllamaProvider(model);
    case 'openai_compat':
      return new OpenAICompatProvider(model);
    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
}

export async function routeToProvider(
  taskType: TaskType,
  messages: Message[],
  options?: ChatOptions,
): Promise<string> {
  const settings = db
    .select()
    .from(schema.aiSettings)
    .where(eq(schema.aiSettings.taskType, taskType))
    .get();

  if (!settings) {
    throw new Error(`No AI settings configured for task type: ${taskType}`);
  }

  const primary = createProvider(settings.provider, settings.model);

  if (await primary.isAvailable()) {
    log.info('Using primary provider', { taskType, provider: settings.provider, model: settings.model });
    return primary.chat(messages, options);
  }

  if (settings.fallbackProvider && settings.fallbackModel) {
    const fallback = createProvider(settings.fallbackProvider, settings.fallbackModel);
    if (await fallback.isAvailable()) {
      log.warn('Primary unavailable, using fallback', {
        taskType,
        primary: settings.provider,
        fallback: settings.fallbackProvider,
      });
      return fallback.chat(messages, options);
    }
  }

  throw new Error(
    `AI provider "${settings.provider}" is not available for task "${taskType}" and no fallback is configured. ` +
      'Check your API keys in .env.local or ensure Ollama is running.',
  );
}
