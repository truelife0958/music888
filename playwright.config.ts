import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const configDir = path.dirname(fileURLToPath(import.meta.url));
const playwrightPort = process.env.PLAYWRIGHT_PORT ?? '4174';
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${playwrightPort}`;
const shouldStartLocalPreview = !process.env.PLAYWRIGHT_BASE_URL;
const localLibraryPaths = [
  path.join(configDir, '.playwright-libs/usr/lib/x86_64-linux-gnu'),
  path.join(configDir, '.playwright-libs/lib/x86_64-linux-gnu'),
].filter((libraryPath) => fs.existsSync(libraryPath));
const shouldInjectLocalLibraries =
  process.platform === 'linux' && localLibraryPaths.length > 0;
const launchEnv = shouldInjectLocalLibraries
  ? {
      ...process.env,
      LD_LIBRARY_PATH: [...localLibraryPaths, process.env.LD_LIBRARY_PATH]
        .filter(Boolean)
        .join(':'),
    }
  : process.env;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL,
    trace: 'on-first-retry',
    launchOptions: {
      env: launchEnv,
    },
  },
  webServer: shouldStartLocalPreview
    ? {
        command: `npm run preview -- --host 127.0.0.1 --port ${playwrightPort}`,
        url: baseURL,
        reuseExistingServer: false,
        timeout: 120_000,
      }
    : undefined,
  projects: [
    {
      name: 'desktop-chromium',
      testIgnore: ['**/mobile-smoke.spec.ts', '**/*.mobile.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'mobile-chromium',
      testMatch: ['**/mobile-smoke.spec.ts', '**/*.mobile.spec.ts'],
      use: {
        ...devices['Pixel 5'],
      },
    },
  ],
});
