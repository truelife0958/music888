import { expect, test } from '@playwright/test';
import { collectUnexpectedPageErrors } from './page-errors';

const COVER_DATA_URL =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2ZmNmI2YiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmaWxsPSIjZmZmIiBmb250LXNpemU9IjI0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Q292ZXI8L3RleHQ+PC9zdmc+';
const AUDIO_DATA_URL = 'data:audio/mp3;base64,SUQzAwAAAAAA';

type RecordedDownload = {
  href: string;
  download: string;
};

declare global {
  interface Window {
    __testDownloads?: RecordedDownload[];
  }
}

type MockSong = {
  id: string;
  name: string;
  artist: string;
  album: string;
  pic_id: string;
};

const searchSongs: MockSong[] = [
  {
    id: 'song-search-1',
    name: '回归之歌',
    artist: '测试歌手A',
    album: '主链路专辑',
    pic_id: 'cover-search-1',
  },
  {
    id: 'song-search-2',
    name: '确定性副歌',
    artist: '测试歌手B',
    album: '主链路专辑',
    pic_id: 'cover-search-2',
  },
];

const rankingHotSongs: MockSong[] = [
  {
    id: 'rank-hot-1',
    name: '热歌榜第一',
    artist: '榜单歌手',
    album: '热歌榜',
    pic_id: 'rank-hot-cover',
  },
];

const rankingNewSongs: MockSong[] = [
  {
    id: 'rank-new-1',
    name: '新歌榜第一',
    artist: '新歌歌手',
    album: '新歌榜',
    pic_id: 'rank-new-cover',
  },
];

const rankingSoarSongs: MockSong[] = [
  {
    id: 'rank-soar-1',
    name: '飙升榜第一',
    artist: '飙升歌手',
    album: '飙升榜',
    pic_id: 'rank-soar-cover',
  },
];

function toGdstudioSearchResponse(songs: MockSong[]) {
  return songs.map((song) => ({
    id: song.id,
    name: song.name,
    artist: song.artist,
    album: song.album,
    pic_id: song.pic_id,
    lyric_id: song.id,
    source: 'netease',
  }));
}

async function installDeterministicAppMocks(page: Parameters<typeof test>[0]['page']) {
  await page.addInitScript(() => {
    localStorage.setItem('music888_onboarded', '1');
    localStorage.setItem('music888_turnstile_verified', '1');
    window.__testDownloads = [];

    let blobUrlIndex = 0;
    URL.createObjectURL = () => `blob:https://music888.example/test-download-${blobUrlIndex++}`;
    URL.revokeObjectURL = () => {};

    HTMLAnchorElement.prototype.click = function click() {
      window.__testDownloads?.push({
        href: this.href,
        download: this.download,
      });
    };

    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        register: () => Promise.resolve({}),
      },
    });

    class TestMediaMetadata {
      constructor(init?: Record<string, unknown>) {
        Object.assign(this, init ?? {});
      }
    }

    Object.defineProperty(window, 'MediaMetadata', {
      configurable: true,
      value: TestMediaMetadata,
    });

    Object.defineProperty(navigator, 'mediaSession', {
      configurable: true,
      value: {
        metadata: null,
        setActionHandler: () => {},
        setPositionState: () => {},
      },
    });

    const mediaProto = window.HTMLMediaElement.prototype;
    mediaProto.load = function load() {
      Object.defineProperty(this, 'paused', {
        configurable: true,
        writable: true,
        value: true,
      });
      Object.defineProperty(this, 'duration', {
        configurable: true,
        value: 180,
      });
      this.dispatchEvent(new Event('loadstart'));
      this.dispatchEvent(new Event('loadedmetadata'));
    };
    mediaProto.play = function play() {
      Object.defineProperty(this, 'paused', {
        configurable: true,
        writable: true,
        value: false,
      });
      this.dispatchEvent(new Event('play'));
      return Promise.resolve();
    };
    mediaProto.pause = function pause() {
      Object.defineProperty(this, 'paused', {
        configurable: true,
        writable: true,
        value: true,
      });
      this.dispatchEvent(new Event('pause'));
    };
    mediaProto.scrollIntoView = function scrollIntoView() {};
    Element.prototype.scrollIntoView = function scrollIntoView() {};
  });

  await page.route('https://challenges.cloudflare.com/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: '',
    });
  });

  await page.route('**/api/proxy**', async (route) => {
    const requestUrl = new URL(route.request().url());
    const targetUrl = requestUrl.searchParams.get('url');

    if (!targetUrl) {
      await route.fulfill({ status: 400, body: 'missing url' });
      return;
    }

    const decodedTargetUrl = decodeURIComponent(targetUrl);
    const apiUrl = new URL(decodedTargetUrl);

    if (apiUrl.hostname === 'music-api.gdstudio.xyz') {
      const type = apiUrl.searchParams.get('type');
      const types = apiUrl.searchParams.get('types');
      const keyword = apiUrl.searchParams.get('name');

      if (type === 'song') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{ id: '139774', name: 'API 探测成功' }]),
        });
        return;
      }

      if (types === 'search') {
        let payload = searchSongs;
        if (keyword === '热歌榜') payload = rankingHotSongs;
        if (keyword === '新歌') payload = rankingNewSongs;
        if (keyword === '飙升') payload = rankingSoarSongs;

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(toGdstudioSearchResponse(payload)),
        });
        return;
      }

      if (types === 'pic') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ url: COVER_DATA_URL }),
        });
        return;
      }
    }

    if (apiUrl.pathname.endsWith('/song/url/match')) {
      const songId = apiUrl.searchParams.get('id') ?? 'unknown-song';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          data: [
            {
              id: songId,
              url: AUDIO_DATA_URL,
              br: 320000,
              size: 5_000_000,
            },
          ],
        }),
      });
      return;
    }

    if (apiUrl.pathname.endsWith('/lyric')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          lrc: {
            lyric: '[00:00.00]测试歌词',
          },
          tlyric: {
            lyric: '',
          },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ code: 200 }),
    });
  });
}

test.describe('核心主链路', () => {
  test.beforeEach(async ({ page }) => {
    await installDeterministicAppMocks(page);
  });

  test('搜索、播放、收藏与历史链路可用', async ({ page }) => {
    const pageErrors = collectUnexpectedPageErrors(page);

    await page.goto('/');

    await page.getByLabel('搜索音乐').fill('主链路回归');
    await page.locator('#searchBtn').click();

    const firstSearchResult = page.locator('#searchResults .song-item').first();
    await expect(firstSearchResult).toBeVisible();
    await expect(firstSearchResult).toContainText('回归之歌');

    await firstSearchResult.click();
    await expect(page.locator('#currentTitle')).toHaveText('回归之歌');
    await expect(page.locator('#currentArtist')).toContainText('测试歌手A');

    await firstSearchResult.locator('.favorite-btn').click();
    await expect(page.locator('#favoritesCount')).toHaveText('1');

    await page.locator('.my-tab-btn[data-mytab="history"]').click();
    await expect(page.locator('#historyResults .song-item').first()).toContainText(
      '回归之歌'
    );

    expect(pageErrors).toEqual([]);
  });

  test('排行榜切换时刷新列表', async ({ page }) => {
    await page.goto('/');

    await page.locator('.tab-btn[data-tab="ranking"]').click();
    await expect(page.locator('#rankingResults .song-item').first()).toContainText(
      '热歌榜第一'
    );

    await page.locator('.ranking-tab[data-rank="new"]').click();
    await expect(page.locator('#rankingResults .song-item').first()).toContainText(
      '新歌榜第一'
    );
  });

  test('探索雷达、播放器切歌、播放模式、音量与键盘快捷键可用', async ({ page }) => {
    let searchRequestCount = 0;

    page.on('request', (request) => {
      if (!request.url().includes('/api/proxy?url=')) {
        return;
      }

      const targetUrl = new URL(request.url()).searchParams.get('url');
      if (!targetUrl) {
        return;
      }

      const decodedTargetUrl = decodeURIComponent(targetUrl);
      if (
        decodedTargetUrl.includes('music-api.gdstudio.xyz') &&
        decodedTargetUrl.includes('types=search')
      ) {
        searchRequestCount++;
      }
    });

    await page.goto('/');
    await expect(page.locator('#searchResults .song-item').first()).toContainText('回归之歌');
    await expect.poll(() => searchRequestCount).toBeGreaterThanOrEqual(1);

    await page.locator('#exploreRadarBtn').click();
    await expect.poll(() => searchRequestCount).toBeGreaterThanOrEqual(2);

    await page.locator('#searchResults .song-item').first().click();
    await expect(page.locator('#currentTitle')).toHaveText('回归之歌');
    await expect(page.locator('#playBtn i')).toHaveClass(/fa-pause/);

    await page.locator('#nextBtn').click();
    await expect(page.locator('#currentTitle')).toHaveText('确定性副歌');

    await page.locator('#prevBtn').click();
    await expect(page.locator('#currentTitle')).toHaveText('回归之歌');

    await page.locator('#currentTitle').click();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#currentTitle')).toHaveText('确定性副歌');
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('#currentTitle')).toHaveText('回归之歌');

    await page.keyboard.press('Space');
    await expect(page.locator('#playBtn i')).toHaveClass(/fa-play/);
    await page.keyboard.press('Space');
    await expect(page.locator('#playBtn i')).toHaveClass(/fa-pause/);

    await page.locator('#playModeBtn').click();
    await expect(page.locator('#playModeBtn')).toHaveAttribute('title', '随机播放');
    await page.locator('#playModeBtn').click();
    await expect(page.locator('#playModeBtn')).toHaveAttribute('title', '单曲循环');
    await page.locator('#playModeBtn').click();
    await expect(page.locator('#playModeBtn')).toHaveAttribute('title', '列表循环');

    await page.locator('#volumeSlider').evaluate((element) => {
      const input = element as HTMLInputElement;
      input.value = '30';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('music888_volume')))
      .toBe('0.3');

    await page.reload();
    await expect(page.locator('#volumeSlider')).toHaveValue('30');
  });

  test('播放器收藏、下载与历史清空可用', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel('搜索音乐').fill('主链路回归');
    await page.locator('#searchBtn').click();
    await page.locator('#searchResults .song-item').first().click();

    await page.locator('#playerFavoriteBtn').click();
    await expect(page.locator('#playerFavoriteBtn i')).toHaveClass(/fas fa-heart/);
    await expect(page.locator('#favoritesCount')).toHaveText('1');

    await page.locator('#downloadSongBtn').click();
    await page.locator('#downloadLyricBtn').click();

    await expect
      .poll(() => page.evaluate(() => window.__testDownloads?.length ?? 0))
      .toBe(2);

    const downloads = await page.evaluate(() => window.__testDownloads ?? []);
    expect(downloads[0].download).toBe('回归之歌 - 测试歌手A.mp3');
    expect(downloads[0].href).toContain('/api/proxy?url=');
    expect(downloads[1].download).toBe('回归之歌.lrc');
    expect(downloads[1].href).toContain('blob:https://music888.example/test-download-0');

    await page.locator('.my-tab-btn[data-mytab="history"]').click();
    await expect(page.locator('#historyResults .song-item').first()).toContainText('回归之歌');

    await page.locator('#clearHistoryBtn').click();
    await expect(page.locator('#historyResults')).toContainText('暂无播放记录');
  });

  test('移动端可通过滑动与页码指示器切换页面', async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 851 });
    await page.goto('/');
    await page.waitForTimeout(300);

    await expect(page.locator('.page-indicator.active')).toHaveAttribute('data-page', '0');

    await page.evaluate(() => {
      const mainContainer = document.querySelector('.main-container');
      if (!mainContainer) {
        return;
      }

      const touchStartEvent = new Event('touchstart', { bubbles: true, cancelable: true });
      Object.defineProperty(touchStartEvent, 'changedTouches', {
        value: [{ screenX: 320, screenY: 240 }],
      });
      mainContainer.dispatchEvent(touchStartEvent);

      const touchEndEvent = new Event('touchend', { bubbles: true, cancelable: true });
      Object.defineProperty(touchEndEvent, 'changedTouches', {
        value: [{ screenX: 120, screenY: 250 }],
      });
      mainContainer.dispatchEvent(touchEndEvent);
    });

    await expect(page.locator('.page-indicator.active')).toHaveAttribute('data-page', '1');
    await expect
      .poll(() =>
        page.evaluate(() => {
          const mainContainer = document.querySelector('.main-container') as HTMLElement | null;
          return mainContainer?.style.transform ?? '';
        })
      )
      .toBe('translateX(-100vw)');

    await page.locator('.page-indicator[data-page="2"]').click();
    await expect(page.locator('.page-indicator.active')).toHaveAttribute('data-page', '2');
    await expect
      .poll(() =>
        page.evaluate(() => {
          const mainContainer = document.querySelector('.main-container') as HTMLElement | null;
          return mainContainer?.style.transform ?? '';
        })
      )
      .toBe('translateX(-200vw)');
  });
});
