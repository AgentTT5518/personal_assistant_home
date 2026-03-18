import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import path from 'path';
import fs from 'fs';
import * as schema from './schema/index.js';
import { createLogger } from '../logger.js';

const log = createLogger('db');

const dbPath = process.env.DATABASE_PATH || 'data/assistant.db';
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

log.info('Database connected', { path: dbPath, mode: 'WAL' });

export const db = drizzle(sqlite, { schema });
export { schema };
export { sqlite };
