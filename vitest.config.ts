import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules/**/*', 'dist/**/*'],
    server: {
      deps: {
        inline: [/\.module\.ts$/]
      }
    },
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false
      }
    }
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
