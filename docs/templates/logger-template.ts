// src/lib/logger.ts
// Structured logger factory — creates feature-scoped loggers.
// See CLAUDE.md Rule 3 for usage requirements.
//
// SETUP PER FEATURE:
//   1. Create src/features/[name]/logger.ts
//   2. Export: export const log = createLogger('[name]');
//   3. Use in all feature files: import { log } from './logger';
//
// This ensures every log is tagged to a feature automatically.
// Replace the output function below with your project's logging library
// (e.g. pino, winston, file output) — the interface stays the same.

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
  level: LogLevel;
  feature: string;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: { name: string; message: string; stack?: string };
}

// -- Replace this function to change where logs go --
function output(entry: LogEntry): void {
  const json = JSON.stringify(entry);
  if (entry.level === 'error') console.error(json);
  else if (entry.level === 'warn') console.warn(json);
  else console.log(json);
}

export interface FeatureLogger {
  info: (message: string, context?: Record<string, unknown>) => void;
  warn: (message: string, context?: Record<string, unknown>) => void;
  error: (message: string, error?: Error, context?: Record<string, unknown>) => void;
  debug: (message: string, context?: Record<string, unknown>) => void;
}

export function createLogger(feature: string): FeatureLogger {
  function log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error
  ): void {
    output({
      level,
      feature,
      message,
      timestamp: new Date().toISOString(),
      ...(context && { context }),
      ...(error && {
        error: { name: error.name, message: error.message, stack: error.stack },
      }),
    });
  }

  return {
    info: (message, context) => log('info', message, context),
    warn: (message, context) => log('warn', message, context),
    error: (message, error, context) => log('error', message, context, error),
    debug: (message, context) => log('debug', message, context),
  };
}

// ── Per-feature setup example ──
//
// src/features/auth/logger.ts:
//   import { createLogger } from '@/lib/logger';
//   export const log = createLogger('auth');
//
// src/features/auth/services/login.ts:
//   import { log } from '../logger';
//   log.info('User logged in', { userId: '123' });
//   log.error('Login failed', error, { email: 'user@example.com' });
//
// src/features/payments/logger.ts:
//   import { createLogger } from '@/lib/logger';
//   export const log = createLogger('payments');
//
// src/features/payments/services/charge.ts:
//   import { log } from '../logger';
//   log.error('Charge failed', error, { orderId: 'abc' });
