import { defineConfig } from 'vitest/config';
import path from 'path';

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
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, "./src"),
      "@core": path.resolve(__dirname, "./src/modules/core"),
      "@user": path.resolve(__dirname, "./src/modules/user"),
      "@auth": path.resolve(__dirname, "./src/modules/auth"),
    },
  },
});
