import { defineConfig, type UserConfigExport } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'node:path';

const resolve = {
  alias: {
    '@': path.resolve(__dirname, 'src'),
    '@test': path.resolve(__dirname, 'test'),
    '@public': path.resolve(__dirname, 'public')
  }
} as const;

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    workspace: [
      {
        resolve,
        test: {
          globals: true,
          name: 'browser',
          include: ['test/**/*.browser.test.ts', 'test/**/*.universal.test.ts'],
          benchmark: {
            include: ['test/**/*.browser.bench.ts']
          },
          environment: 'browser',
          browser: {
            provider: 'playwright',
            enabled: true,
            headless: true,
            screenshotFailures: false,
            instances: [
              { browser: 'chromium' }
              // { browser: 'firefox' },
              // { browser: 'webkit' },
            ]
          }
        }
      },
      {
        resolve,
        test: {
          globals: true,
          name: 'server',
          include: ['test/**/*.server.test.ts', 'test/**/*.universal.test.ts'],
          environment: 'node',
          benchmark: {
            include: ['test/**/*.server.bench.ts']
          }
        }
      }
    ]
  }
} satisfies UserConfigExport);
