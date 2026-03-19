import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';
import { db, schema } from './index.js';
import { createLogger } from '../logger.js';

const log = createLogger('db-seed');

const defaultCategories = [
  { name: 'Housing', color: '#6366f1', icon: 'home' },
  { name: 'Utilities', color: '#8b5cf6', icon: 'zap' },
  { name: 'Groceries', color: '#22c55e', icon: 'shopping-cart' },
  { name: 'Transport', color: '#f59e0b', icon: 'car' },
  { name: 'Dining Out', color: '#ef4444', icon: 'utensils' },
  { name: 'Entertainment', color: '#ec4899', icon: 'film' },
  { name: 'Health & Medical', color: '#14b8a6', icon: 'heart' },
  { name: 'Insurance', color: '#64748b', icon: 'shield' },
  { name: 'Education', color: '#0ea5e9', icon: 'book-open' },
  { name: 'Shopping', color: '#f97316', icon: 'shopping-bag' },
  { name: 'Subscriptions', color: '#a855f7', icon: 'repeat' },
  { name: 'Income', color: '#10b981', icon: 'dollar-sign' },
  { name: 'Savings & Investments', color: '#06b6d4', icon: 'trending-up' },
  { name: 'Transfers', color: '#94a3b8', icon: 'arrow-left-right' },
  { name: 'Other', color: '#6b7280', icon: 'more-horizontal' },
];

const defaultAiSettings = [
  { taskType: 'pdf_extraction', provider: 'claude', model: 'claude-sonnet-4-5-20250514' },
  { taskType: 'categorisation', provider: 'claude', model: 'claude-sonnet-4-5-20250514' },
  { taskType: 'analysis_insights', provider: 'claude', model: 'claude-sonnet-4-5-20250514' },
  { taskType: 'insurance_analysis', provider: 'claude', model: 'claude-sonnet-4-5-20250514' },
  { taskType: 'health_analysis', provider: 'claude', model: 'claude-sonnet-4-5-20250514' },
];

try {
  const now = new Date().toISOString();

  log.info('Seeding categories...');
  for (const cat of defaultCategories) {
    db.insert(schema.categories)
      .values({
        id: uuidv4(),
        name: cat.name,
        color: cat.color,
        icon: cat.icon,
        isDefault: true,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: schema.categories.name })
      .run();
  }

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

  log.info('Seed complete');
} catch (error) {
  log.error('Seed failed', error instanceof Error ? error : new Error(String(error)));
  process.exit(1);
}
