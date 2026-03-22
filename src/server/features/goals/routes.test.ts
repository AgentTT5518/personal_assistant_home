import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { app } from '../../app.js';
import { db, schema } from '../../lib/db/index.js';

function seedCategory(overrides: Partial<typeof schema.categories.$inferInsert> = {}) {
  const id = uuidv4();
  const now = new Date().toISOString();
  db.insert(schema.categories)
    .values({
      id,
      name: `Category ${id.slice(0, 6)}`,
      color: '#3b82f6',
      icon: 'tag',
      createdAt: now,
      updatedAt: now,
      ...overrides,
    })
    .run();
  return id;
}

function seedAccount(overrides: Partial<typeof schema.accounts.$inferInsert> = {}) {
  const id = uuidv4();
  const now = new Date().toISOString();
  db.insert(schema.accounts)
    .values({
      id,
      name: `Account ${id.slice(0, 6)}`,
      type: 'savings',
      currentBalance: 5000,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    })
    .run();
  return id;
}

function seedGoal(overrides: Partial<typeof schema.goals.$inferInsert> = {}) {
  const id = uuidv4();
  const now = new Date().toISOString();
  db.insert(schema.goals)
    .values({
      id,
      name: `Goal ${id.slice(0, 6)}`,
      targetAmount: 10000,
      currentAmount: 0,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      ...overrides,
    })
    .run();
  return id;
}

beforeEach(() => {
  // Delete in FK-safe order
  db.delete(schema.goalContributions).run();
  db.delete(schema.goals).run();
  db.delete(schema.splitTransactions).run();
  db.delete(schema.transactionTags).run();
  db.delete(schema.budgets).run();
  db.delete(schema.bills).run();
  db.delete(schema.categoryRules).run();
  db.delete(schema.transactions).run();
  db.delete(schema.accounts).run();
  db.delete(schema.categories).run();
});

describe('Goals CRUD', () => {
  it('GET /api/goals returns empty list', async () => {
    const res = await request(app).get('/api/goals');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('POST /api/goals creates a goal', async () => {
    const res = await request(app)
      .post('/api/goals')
      .send({ name: 'Emergency Fund', targetAmount: 10000 });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Emergency Fund');
    expect(res.body.targetAmount).toBe(10000);
    expect(res.body.currentAmount).toBe(0);
    expect(res.body.status).toBe('active');
  });

  it('POST /api/goals with account and category', async () => {
    const accountId = seedAccount();
    const categoryId = seedCategory();
    const res = await request(app)
      .post('/api/goals')
      .send({
        name: 'Holiday',
        targetAmount: 5000,
        deadline: '2026-12-31',
        accountId,
        categoryId,
      });
    expect(res.status).toBe(201);
    expect(res.body.accountId).toBe(accountId);
    expect(res.body.accountName).toBeTruthy();
    expect(res.body.categoryId).toBe(categoryId);
    expect(res.body.categoryName).toBeTruthy();
    expect(res.body.deadline).toBe('2026-12-31');
  });

  it('POST /api/goals rejects invalid account', async () => {
    const res = await request(app)
      .post('/api/goals')
      .send({ name: 'Test', targetAmount: 1000, accountId: uuidv4() });
    expect(res.status).toBe(404);
  });

  it('GET /api/goals/:id returns goal with contributions', async () => {
    const goalId = seedGoal();
    const res = await request(app).get(`/api/goals/${goalId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(goalId);
    expect(res.body.contributions).toEqual([]);
  });

  it('GET /api/goals/:id returns 404 for missing goal', async () => {
    const res = await request(app).get(`/api/goals/${uuidv4()}`);
    expect(res.status).toBe(404);
  });

  it('GET /api/goals?status=active filters by status', async () => {
    seedGoal({ status: 'active' });
    seedGoal({ status: 'completed' });
    seedGoal({ status: 'cancelled' });

    const res = await request(app).get('/api/goals?status=active');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].status).toBe('active');
  });

  it('PUT /api/goals/:id updates a goal', async () => {
    const goalId = seedGoal();
    const res = await request(app)
      .put(`/api/goals/${goalId}`)
      .send({ name: 'Updated Goal', targetAmount: 20000 });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Goal');
    expect(res.body.targetAmount).toBe(20000);
  });

  it('PUT /api/goals/:id updates status', async () => {
    const goalId = seedGoal();
    const res = await request(app)
      .put(`/api/goals/${goalId}`)
      .send({ status: 'completed' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
  });

  it('DELETE /api/goals/:id deletes goal and cascades contributions', async () => {
    const goalId = seedGoal();

    // Add a contribution
    await request(app)
      .post(`/api/goals/${goalId}/contribute`)
      .send({ amount: 500 });

    const delRes = await request(app).delete(`/api/goals/${goalId}`);
    expect(delRes.status).toBe(204);

    // Verify goal is gone
    const getRes = await request(app).get(`/api/goals/${goalId}`);
    expect(getRes.status).toBe(404);

    // Verify contributions are gone (cascade)
    const contributions = db
      .select()
      .from(schema.goalContributions)
      .all();
    expect(contributions.length).toBe(0);
  });
});

describe('Contributions', () => {
  it('POST /api/goals/:id/contribute adds contribution and updates currentAmount', async () => {
    const goalId = seedGoal({ currentAmount: 1000 });

    const res = await request(app)
      .post(`/api/goals/${goalId}/contribute`)
      .send({ amount: 500, note: 'March savings' });

    expect(res.status).toBe(201);
    expect(res.body.currentAmount).toBe(1500);
    expect(res.body.contributions).toHaveLength(1);
    expect(res.body.contributions[0].amount).toBe(500);
    expect(res.body.contributions[0].note).toBe('March savings');
  });

  it('multiple contributions accumulate correctly', async () => {
    const goalId = seedGoal();

    await request(app)
      .post(`/api/goals/${goalId}/contribute`)
      .send({ amount: 100 });
    await request(app)
      .post(`/api/goals/${goalId}/contribute`)
      .send({ amount: 200 });
    const res = await request(app)
      .post(`/api/goals/${goalId}/contribute`)
      .send({ amount: 300 });

    expect(res.body.currentAmount).toBe(600);
    expect(res.body.contributions).toHaveLength(3);

    // Verify SUM of contributions equals currentAmount
    const sum = res.body.contributions.reduce(
      (acc: number, c: { amount: number }) => acc + c.amount,
      0,
    );
    expect(sum).toBe(600);
  });

  it('contribute with custom date', async () => {
    const goalId = seedGoal();
    const res = await request(app)
      .post(`/api/goals/${goalId}/contribute`)
      .send({ amount: 100, date: '2026-01-15' });

    expect(res.status).toBe(201);
    expect(res.body.contributions[0].date).toBe('2026-01-15');
  });

  it('contribute rejects missing goal', async () => {
    const res = await request(app)
      .post(`/api/goals/${uuidv4()}/contribute`)
      .send({ amount: 100 });
    expect(res.status).toBe(404);
  });

  it('contribute rejects zero/negative amount', async () => {
    const goalId = seedGoal();
    const res = await request(app)
      .post(`/api/goals/${goalId}/contribute`)
      .send({ amount: 0 });
    expect(res.status).toBe(400);
  });
});

describe('Sync Balance', () => {
  it('POST /api/goals/:id/sync-balance syncs from account', async () => {
    const accountId = seedAccount({ currentBalance: 3000 });
    const goalId = seedGoal({ accountId, currentAmount: 1000 });

    const res = await request(app).post(`/api/goals/${goalId}/sync-balance`);

    expect(res.status).toBe(200);
    expect(res.body.currentAmount).toBe(3000);
    // Should have a balancing contribution of 2000
    expect(res.body.contributions).toHaveLength(1);
    expect(res.body.contributions[0].amount).toBe(2000);
    expect(res.body.contributions[0].note).toBe('Synced from account');
  });

  it('sync-balance warns when account has multiple goals', async () => {
    const accountId = seedAccount({ currentBalance: 5000 });
    seedGoal({ accountId, status: 'active' });
    const goalId = seedGoal({ accountId, status: 'active' });

    const res = await request(app).post(`/api/goals/${goalId}/sync-balance`);

    expect(res.status).toBe(200);
    expect(res.body.warning).toContain('linked to 2 goals');
  });

  it('sync-balance rejects goal without account', async () => {
    const goalId = seedGoal();

    const res = await request(app).post(`/api/goals/${goalId}/sync-balance`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('NO_ACCOUNT');
  });

  it('sync-balance handles negative diff (account balance lower than goal)', async () => {
    const accountId = seedAccount({ currentBalance: 500 });
    const goalId = seedGoal({ accountId, currentAmount: 1000 });

    const res = await request(app).post(`/api/goals/${goalId}/sync-balance`);

    expect(res.status).toBe(200);
    expect(res.body.currentAmount).toBe(500);
    expect(res.body.contributions[0].amount).toBe(-500);
  });

  it('sync-balance keeps contribution log consistent', async () => {
    const accountId = seedAccount({ currentBalance: 2000 });
    const goalId = seedGoal({ accountId, currentAmount: 0 });

    // First: manual contribution
    await request(app)
      .post(`/api/goals/${goalId}/contribute`)
      .send({ amount: 500 });

    // Then: sync
    const res = await request(app).post(`/api/goals/${goalId}/sync-balance`);

    expect(res.body.currentAmount).toBe(2000);
    expect(res.body.contributions).toHaveLength(2);

    // SUM should equal currentAmount
    const sum = res.body.contributions.reduce(
      (acc: number, c: { amount: number }) => acc + c.amount,
      0,
    );
    expect(sum).toBe(2000);
  });
});
