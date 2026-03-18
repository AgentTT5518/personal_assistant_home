import 'dotenv/config';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db } from './index.js';
import { createLogger } from '../logger.js';

const log = createLogger('db-migrate');

try {
  log.info('Running migrations...');
  migrate(db, { migrationsFolder: 'src/server/lib/db/migrations' });
  log.info('Migrations complete');
} catch (error) {
  log.error('Migration failed', error instanceof Error ? error : new Error(String(error)));
  process.exit(1);
}
