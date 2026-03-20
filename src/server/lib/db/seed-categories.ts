import { v4 as uuidv4 } from 'uuid';
import { db, schema } from './index.js';

interface CategoryDef {
  name: string;
  color: string;
  icon: string;
  parentName: string | null;
}

const defaultCategories: CategoryDef[] = [
  // Top-level parents (inserted first)
  { name: 'Income',          color: '#22c55e', icon: 'dollar-sign',      parentName: null },
  { name: 'Housing',         color: '#3b82f6', icon: 'home',             parentName: null },
  { name: 'Transport',       color: '#f59e0b', icon: 'car',              parentName: null },
  { name: 'Food & Dining',   color: '#ef4444', icon: 'utensils',         parentName: null },
  { name: 'Shopping',        color: '#8b5cf6', icon: 'shopping-bag',     parentName: null },
  { name: 'Health',          color: '#06b6d4', icon: 'heart',            parentName: null },
  { name: 'Entertainment',   color: '#ec4899', icon: 'film',             parentName: null },
  { name: 'Subscriptions',   color: '#a855f7', icon: 'repeat',           parentName: null },
  { name: 'Insurance',       color: '#14b8a6', icon: 'shield',           parentName: null },
  { name: 'Savings',         color: '#10b981', icon: 'piggy-bank',       parentName: null },
  { name: 'Transfers',       color: '#6b7280', icon: 'arrow-right-left', parentName: null },
  { name: 'Fees & Charges',  color: '#f97316', icon: 'alert-circle',     parentName: null },
  { name: 'Other',           color: '#9ca3af', icon: 'help-circle',      parentName: null },
  // Children (inserted after parents so we can look up parentId by name)
  { name: 'Salary',          color: '#16a34a', icon: 'briefcase',        parentName: 'Income' },
  { name: 'Utilities',       color: '#1d4ed8', icon: 'zap',              parentName: 'Housing' },
  { name: 'Rent/Mortgage',   color: '#2563eb', icon: 'key',              parentName: 'Housing' },
  { name: 'Groceries',       color: '#dc2626', icon: 'shopping-cart',    parentName: 'Food & Dining' },
  { name: 'Restaurants',     color: '#b91c1c', icon: 'coffee',           parentName: 'Food & Dining' },
];

export function seedDefaultCategories(): void {
  const now = new Date().toISOString();

  // Insert/update parents first (parentName === null)
  const parents = defaultCategories.filter((c) => c.parentName === null);
  for (const cat of parents) {
    db.insert(schema.categories)
      .values({
        id: uuidv4(),
        name: cat.name,
        parentId: null,
        color: cat.color,
        icon: cat.icon,
        isDefault: true,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: schema.categories.name,
        set: {
          parentId: null,
          color: cat.color,
          icon: cat.icon,
          updatedAt: now,
        },
      })
      .run();
  }

  // Look up parent IDs by name
  const parentRows = db.select({ id: schema.categories.id, name: schema.categories.name })
    .from(schema.categories)
    .all();
  const parentIdMap = new Map(parentRows.map((r) => [r.name, r.id]));

  // Insert/update children
  const children = defaultCategories.filter((c) => c.parentName !== null);
  for (const cat of children) {
    const parentId = parentIdMap.get(cat.parentName!) ?? null;
    db.insert(schema.categories)
      .values({
        id: uuidv4(),
        name: cat.name,
        parentId,
        color: cat.color,
        icon: cat.icon,
        isDefault: true,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: schema.categories.name,
        set: {
          parentId,
          color: cat.color,
          icon: cat.icon,
          updatedAt: now,
        },
      })
      .run();
  }
}
