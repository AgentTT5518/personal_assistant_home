import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/server/lib/db/schema/index.ts',
  out: './src/server/lib/db/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_PATH || 'data/assistant.db',
  },
});
