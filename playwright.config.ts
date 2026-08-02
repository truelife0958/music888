import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const configDir = path.dirname(fileURLToPath(import.meta.url));
const playwrightPort = process.env.PLAYWRIGHT_PORT ?? '4174';
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${playwrightPort}`;
const shouldStartLocalPreview = !process.env.PLAYWRIGHT_BASE_URL;
const chromiumExecutablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const detectedLibraryPaths = [
  path.join(configDir, '.playwright-libs/usr/lib/x86_64-linux-gnu'),
  path.join(configDir, '.playwright-libs/lib/x86_64-linux-gnu'),
].filter((libraryPath) => fs.existsSync(libraryPath));

function prepareLibraryPath(libraryPath: string): string {
  if (process.platform !== 'linux') return libraryPath;

  const entries = fs.readdirSync(libraryPath, { withFileTypes: true });
  const hasTextSymlink = entries.some((entry) => {
    if (!entry.isFile()) return false;
    const sourcePath = path.join(libraryPath, entry.name);
    const stat = fs.statSync(sourcePath);
    if (stat.size > 255) return false;

    const target = fs.readFileSync(sourcePath, 'utf8').trim();
    return target.length > 0 && target.length < 255 && fs.existsSync(path.resolve(libraryPath, target));
  });

  if (!hasTextSymlink) return libraryPath;

  const repairedPath = fs.mkdtempSync(path.join(os.tmpdir(), 'music888-playwright-libs-'));
  for (const entry of entries) {
    const sourcePath = path.join(libraryPath, entry.name);
    const destinationPath = path.join(repairedPath, entry.name);

    if (!entry.isFile()) continue;

    const stat = fs.statSync(sourcePath);
    if (stat.size <= 255) {
      const target = fs.readFileSync(sourcePath, 'utf8').trim();
      const targetPath = path.resolve(libraryPath, target);
      if (target && fs.existsSync(targetPath)) {
        fs.symlinkSync(targetPath, destinationPath);
      }
      continue;
    }

    fs.symlinkSync(sourcePath, destinationPath);
  }

  return repairedPath;
}

const localLibraryPaths = detectedLibraryPaths.map(prepareLibraryPath);
const shouldInjectLocalLibraries =
  process.platform === 'linux' &&
  localLibraryPaths.length > 0 &&
  process.env.PLAYWRIGHT_USE_LOCAL_LIBS !== '0';
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
      ...(chromiumExecutablePath ? { executablePath: chromiumExecutablePath } : {}),
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
