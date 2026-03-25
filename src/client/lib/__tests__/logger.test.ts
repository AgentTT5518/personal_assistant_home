import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { createLogger } from '../logger.js';

describe('createLogger', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T10:30:00.000Z'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('returns object with info, warn, error, debug methods', () => {
    const logger = createLogger('test-feature');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('info method calls console.log with JSON', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = createLogger('dashboard');
    logger.info('page loaded');

    expect(spy).toHaveBeenCalledOnce();
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.level).toBe('info');
    expect(parsed.feature).toBe('dashboard');
    expect(parsed.message).toBe('page loaded');
  });

  it('warn method calls console.warn with JSON', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const logger = createLogger('settings');
    logger.warn('deprecated option used');

    expect(spy).toHaveBeenCalledOnce();
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.level).toBe('warn');
    expect(parsed.feature).toBe('settings');
    expect(parsed.message).toBe('deprecated option used');
  });

  it('error method calls console.error with JSON and includes error details', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logger = createLogger('upload');
    const err = new Error('file too large');
    logger.error('upload failed', err);

    expect(spy).toHaveBeenCalledOnce();
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.level).toBe('error');
    expect(parsed.feature).toBe('upload');
    expect(parsed.message).toBe('upload failed');
    expect(parsed.error.name).toBe('Error');
    expect(parsed.error.message).toBe('file too large');
    expect(parsed.error.stack).toBeDefined();
  });

  it('debug method calls console.debug with JSON', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const logger = createLogger('transactions');
    logger.debug('filter applied');

    expect(spy).toHaveBeenCalledOnce();
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.level).toBe('debug');
    expect(parsed.feature).toBe('transactions');
    expect(parsed.message).toBe('filter applied');
  });

  it('includes timestamp, feature, and context in output', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = createLogger('analysis');
    logger.info('report generated', { reportId: '123', pages: 5 });

    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.timestamp).toBe('2026-01-15T10:30:00.000Z');
    expect(parsed.feature).toBe('analysis');
    expect(parsed.context).toEqual({ reportId: '123', pages: 5 });
  });

  it('error method handles missing error parameter', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logger = createLogger('test');
    logger.error('something went wrong');

    expect(spy).toHaveBeenCalledOnce();
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.level).toBe('error');
    expect(parsed.message).toBe('something went wrong');
    expect(parsed.error).toBeUndefined();
  });

  it('omits context when not provided', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = createLogger('test');
    logger.info('no context');

    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.context).toBeUndefined();
  });

  it('error method includes context alongside error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logger = createLogger('api');
    const err = new TypeError('invalid input');
    logger.error('request failed', err, { endpoint: '/api/data', status: 400 });

    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.error.name).toBe('TypeError');
    expect(parsed.context).toEqual({ endpoint: '/api/data', status: 400 });
  });
});
