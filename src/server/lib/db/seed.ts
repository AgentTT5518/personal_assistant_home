import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';
import { db, schema } from './index.js';
import { seedDefaultCategories } from './seed-categories.js';
import { createLogger } from '../logger.js';

const log = createLogger('db-seed');

const defaultAiSettings = [
  { taskType: 'pdf_extraction', provider: 'claude', model: 'claude-sonnet-4-5-20250514' },
  { taskType: 'categorisation', provider: 'claude', model: 'claude-haiku-4-5-20251001' },
  { taskType: 'analysis_insights', provider: 'claude', model: 'claude-sonnet-4-5-20250514' },
  { taskType: 'insurance_analysis', provider: 'claude', model: 'claude-sonnet-4-5-20250514' },
  { taskType: 'health_analysis', provider: 'claude', model: 'claude-sonnet-4-5-20250514' },
  { taskType: 'pdf_vision_extraction', provider: 'claude', model: 'claude-sonnet-4-5-20250514' },
];

try {
  const now = new Date().toISOString();

  log.info('Seeding categories...');
  seedDefaultCategories();

  log.info('Seeding AI settings...');
  for (const setting of defaultAiSettings) {
    db.insert(schema.aiSettings)
      .values({
        id: uuidv4(),
        taskType: setting.taskType,
        provider: setting.provider,
        model: setting.model,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing()
      .run();
  }

  log.info('Seeding app settings...');
  const defaultAppSettings = [
    { key: 'currency', value: 'AUD' },
  ];
  for (const setting of defaultAppSettings) {
    db.insert(schema.appSettings)
      .values({
        key: setting.key,
        value: setting.value,
        updatedAt: now,
      })
      .onConflictDoNothing()
      .run();
  }

  log.info('Seed complete');
} catch (error) {
  log.error('Seed failed', error instanceof Error ? error : new Error(String(error)));
  process.exit(1);
}
