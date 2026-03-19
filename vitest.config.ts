import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'server',
          root: './src/server',
          environment: 'node',
          include: ['**/*.test.ts'],
          setupFiles: ['../../tests/server-setup.ts'],
        },
        resolve: {
          alias: {
            '@server': path.resolve(__dirname, 'src/server'),
            '@shared': path.resolve(__dirname, 'src/shared'),
          },
        },
      },
      {
        test: {
          name: 'client',
          root: './src/client',
          environment: 'jsdom',
          include: ['**/*.test.ts', '**/*.test.tsx'],
          setupFiles: ['../../tests/setup.ts'],
        },
        resolve: {
          alias: {
            '@client': path.resolve(__dirname, 'src/client'),
            '@shared': path.resolve(__dirname, 'src/shared'),
          },
        },
      },
    ],
  },
});
