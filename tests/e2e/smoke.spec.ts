import { expect, test } from '@playwright/test';
import { collectUnexpectedPageErrors } from './page-errors';

test('桌面端主界面可见', async ({ page }) => {
  const pageErrors = collectUnexpectedPageErrors(page);

  await page.goto('/');

  await expect(page.locator('#searchInput')).toBeVisible();
  await expect(page.locator('#playBtn')).toBeVisible();
  await expect(page.locator('#playlistActionBtn')).toBeVisible();

  await page.locator('#playlistActionSelect').selectOption('radio');
  await expect(page.locator('#playlistActionInput')).toHaveAttribute(
    'placeholder',
    '输入电台ID...'
  );
  await expect(page.locator('#playlistActionBtn span')).toHaveText('添加');
  expect(pageErrors).toEqual([]);
});
