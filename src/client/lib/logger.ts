type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
  level: LogLevel;
  feature: string;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: { name: string; message: string; stack?: string };
}

function output(entry: LogEntry): void {
  const json = JSON.stringify(entry);
  if (entry.level === 'error') console.error(json);
  else if (entry.level === 'warn') console.warn(json);
  else if (entry.level === 'debug') console.debug(json);
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
    error?: Error,
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
