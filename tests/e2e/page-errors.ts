import type { Page } from '@playwright/test';

const IGNORED_PAGE_ERRORS = new Set([
  'WebSocket closed without opened.',
]);

export function collectUnexpectedPageErrors(page: Page): string[] {
  const pageErrors: string[] = [];

  page.on('pageerror', (error) => {
    if (!IGNORED_PAGE_ERRORS.has(error.message)) {
      pageErrors.push(error.message);
    }
  });

  return pageErrors;
}
