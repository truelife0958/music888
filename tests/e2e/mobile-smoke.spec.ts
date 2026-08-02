import { expect, test } from '@playwright/test';
import { collectUnexpectedPageErrors } from './page-errors';

test('移动端主界面可见', async ({ page }) => {
  const pageErrors = collectUnexpectedPageErrors(page);

  await page.goto('/');

  await expect(page.locator('#searchInput')).toBeVisible();
  await expect(page.locator('#playBtn')).toBeVisible();
  await expect(page.locator('#playlistActionBtn')).toBeVisible();

  await page.locator('#playlistActionSelect').selectOption('playlist');
  await expect(page.locator('#playlistActionInput')).toHaveAttribute(
    'placeholder',
    '输入歌单ID或链接...'
  );
  await expect(page.locator('#playlistActionBtn span')).toHaveText('解析');
  expect(pageErrors).toEqual([]);
});
