import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../app.js';
import { db, schema, sqlite } from '../../lib/db/index.js';

function seedAppSetting(key: string, value: string) {
  const now = new Date().toISOString();
  db.insert(schema.appSettings).values({ key, value, updatedAt: now }).run();
}

describe('App Settings Routes', () => {
  beforeEach(() => {
    sqlite.exec('DELETE FROM app_settings');
  });

  describe('GET /api/settings/app', () => {
    it('returns empty object when no settings exist', async () => {
      const res = await request(app).get('/api/settings/app');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({});
    });

    it('returns all settings as key-value pairs', async () => {
      seedAppSetting('currency', 'AUD');
      seedAppSetting('locale', 'en-AU');

      const res = await request(app).get('/api/settings/app');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ currency: 'AUD', locale: 'en-AU' });
    });
  });

  describe('PUT /api/settings/app/:key', () => {
    it('creates a new setting', async () => {
      const res = await request(app)
        .put('/api/settings/app/currency')
        .send({ value: 'USD' });
      expect(res.status).toBe(200);
      expect(res.body.key).toBe('currency');
      expect(res.body.value).toBe('USD');
    });

    it('updates an existing setting', async () => {
      seedAppSetting('currency', 'AUD');

      const res = await request(app)
        .put('/api/settings/app/currency')
        .send({ value: 'EUR' });
      expect(res.status).toBe(200);
      expect(res.body.value).toBe('EUR');

      const getRes = await request(app).get('/api/settings/app');
      expect(getRes.body.currency).toBe('EUR');
    });

    it('rejects invalid currency code', async () => {
      const res = await request(app)
        .put('/api/settings/app/currency')
        .send({ value: 'NOTACURRENCY' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects empty value', async () => {
      const res = await request(app)
        .put('/api/settings/app/currency')
        .send({ value: '' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('accepts valid non-currency settings', async () => {
      const res = await request(app)
        .put('/api/settings/app/locale')
        .send({ value: 'en-AU' });
      expect(res.status).toBe(200);
      expect(res.body.value).toBe('en-AU');
    });
  });
});
