import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { preview } from 'vite';

const PORT = Number(process.env.UI_AUDIT_PORT ?? 4176);
const BASE_URL = process.env.UI_AUDIT_URL ?? `http://127.0.0.1:${PORT}/`;
const OUT_DIR = path.resolve('test-results/ui-audit');
const COVER_URL = new URL('__ui-audit-cover.svg', BASE_URL).toString();
const COVER_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" rx="20" fill="#4a90e2"/><text x="50%" y="50%" fill="#fff" font-size="24" text-anchor="middle" dy=".3em">Audit</text></svg>';
const AUDIO_DATA_URL = createSilentWavDataUrl();

const results = {
  url: BASE_URL,
  startedAt: new Date().toISOString(),
  checks: [],
  pageErrors: [],
  consoleErrors: [],
  screenshots: [],
};

function record(name, ok, detail = '') {
  results.checks.push({ name, ok, detail });
  if (!ok) throw new Error(`${name}${detail ? `: ${detail}` : ''}`);
}

function createSilentWavDataUrl() {
  const sampleRate = 8000;
  const durationSeconds = 1;
  const bytesPerSample = 2;
  const sampleCount = sampleRate * durationSeconds;
  const dataSize = sampleCount * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * bytesPerSample, 28);
  buffer.writeUInt16LE(bytesPerSample, 32);
  buffer.writeUInt16LE(8 * bytesPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  return `data:audio/wav;base64,${buffer.toString('base64')}`;
}

async function waitForServer(url, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }
  throw new Error(`Preview server did not become ready: ${url}`);
}

async function startPreviewServer() {
  if (process.env.UI_AUDIT_URL) return null;

  return preview({
    logLevel: 'silent',
    preview: {
      host: '127.0.0.1',
      port: PORT,
      strictPort: true,
    },
  });
}

async function closePreviewServer(server) {
  if (!server?.httpServer) return;
  await new Promise((resolve) => {
    server.httpServer.close(resolve);
  });
}

async function installBrowserMocks(page) {
  await page.addInitScript(() => {
    localStorage.setItem('music888_onboarded', '1');
    localStorage.setItem('music888_turnstile_verified', '1');

    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { register: () => Promise.resolve({}) },
    });

    class TestMediaMetadata {
      constructor(init) {
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
      Object.defineProperty(this, 'duration', { configurable: true, value: 180 });
      this.dispatchEvent(new Event('loadstart'));
      this.dispatchEvent(new Event('loadedmetadata'));
    };
    mediaProto.play = function play() {
      this.dispatchEvent(new Event('play'));
      return Promise.resolve();
    };
    mediaProto.pause = function pause() {
      this.dispatchEvent(new Event('pause'));
    };
    mediaProto.scrollIntoView = function scrollIntoView() {};
    Element.prototype.scrollIntoView = function scrollIntoView() {};
  });

  await page.route('https://challenges.cloudflare.com/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
  });

  await page.route('**/__ui-audit-cover.svg*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'image/svg+xml', body: COVER_SVG });
  });

  await page.route('**/api/proxy**', async (route) => {
    const requestUrl = new URL(route.request().url());
    const targetUrl = requestUrl.searchParams.get('url');
    if (!targetUrl) {
      await route.fulfill({ status: 400, body: 'missing url' });
      return;
    }

    const apiUrl = new URL(decodeURIComponent(targetUrl));
    const payload = await mockProxyPayload(apiUrl);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload),
    });
  });
}

async function mockProxyPayload(apiUrl) {
  if (apiUrl.hostname === 'music-api.gdstudio.xyz') {
    const type = apiUrl.searchParams.get('type');
    const types = apiUrl.searchParams.get('types');
    const name = apiUrl.searchParams.get('name');

    if (type === 'song') return [{ id: '139774', name: 'API 探测成功' }];
    if (types === 'pic') return { url: COVER_URL };
    if (types === 'search') {
      if (name === '热歌榜') return toGdstudioSongs([{ id: 'rank-hot', name: '巡检热歌榜第一', artist: '榜单歌手' }]);
      if (name === '新歌') return toGdstudioSongs([{ id: 'rank-new', name: '巡检新歌榜第一', artist: '新歌歌手' }]);
      if (name === '飙升') return toGdstudioSongs([{ id: 'rank-soar', name: '巡检飙升榜第一', artist: '飙升歌手' }]);
      return toGdstudioSongs([{ id: 'search-1', name: '浏览器巡检歌曲', artist: '巡检歌手' }]);
    }
  }

  if (apiUrl.pathname.endsWith('/artist/list')) {
    return {
      code: 200,
      artists: [{ id: 7002, name: '浏览器巡检歌手', picUrl: COVER_URL, musicSize: 18, albumSize: 2 }],
      more: false,
    };
  }
  if (apiUrl.pathname.endsWith('/artist/desc')) {
    return { code: 200, briefDesc: '用于浏览器巡检的歌手简介。', introduction: [] };
  }
  if (apiUrl.pathname.endsWith('/artist/album')) {
    return {
      code: 200,
      hotAlbums: [{ id: 7201, name: '巡检精选专辑', picUrl: COVER_URL, publishTime: Date.UTC(2024, 0, 1), size: 2 }],
      more: false,
    };
  }
  if (apiUrl.pathname.endsWith('/album') || apiUrl.pathname.endsWith('/song/detail')) {
    return {
      code: 200,
      album: { id: 7201, name: '巡检精选专辑', picUrl: COVER_URL },
      songs: auditSongs(),
    };
  }
  if (apiUrl.pathname.endsWith('/dj/catelist')) {
    return { code: 200, categories: [{ id: 2001, name: '情感' }, { id: 2002, name: '音乐故事' }] };
  }
  if (apiUrl.pathname.endsWith('/dj/hot') || apiUrl.pathname.endsWith('/dj/recommend/type')) {
    return {
      code: 200,
      djRadios: [{ id: 8201, name: '浏览器巡检电台', picUrl: COVER_URL, programCount: 2, dj: { nickname: '巡检主播' } }],
    };
  }
  if (apiUrl.pathname.endsWith('/dj/program')) {
    return {
      code: 200,
      programs: [{ id: 8302, mainTrackId: 8402, name: '浏览器巡检节目', duration: 240000, coverUrl: COVER_URL, dj: { nickname: '巡检主播' } }],
      more: false,
    };
  }
  if (apiUrl.pathname.endsWith('/dj/detail')) {
    return { code: 200, data: { id: 8201, name: '浏览器巡检电台', picUrl: COVER_URL, dj: { nickname: '巡检主播' } } };
  }
  if (apiUrl.pathname.endsWith('/user/playlist')) {
    return { code: 200, playlist: [{ id: 9101, name: '浏览器巡检歌单', coverImgUrl: COVER_URL, trackCount: 2 }] };
  }
  if (apiUrl.pathname.endsWith('/playlist/detail')) {
    return { code: 200, playlist: { id: 3778678, name: '解析歌单巡检样本', trackIds: [{ id: 7301 }, { id: 7302 }] } };
  }
  if (apiUrl.pathname.endsWith('/song/url/match')) {
    return { code: 200, data: [{ id: apiUrl.searchParams.get('id') ?? 'audit-song', url: AUDIO_DATA_URL, br: 320000, size: 4000000 }] };
  }
  if (apiUrl.pathname.endsWith('/lyric')) {
    return { code: 200, lrc: { lyric: '[00:00.00]浏览器巡检歌词' }, tlyric: { lyric: '' } };
  }

  return { code: 200 };
}

function toGdstudioSongs(songs) {
  return songs.map((song) => ({
    id: song.id,
    name: song.name,
    artist: song.artist,
    album: '巡检专辑',
    pic_id: `${song.id}-cover`,
    lyric_id: song.id,
    source: 'netease',
  }));
}

function auditSongs() {
  return [
    {
      id: 7301,
      name: '巡检专辑主打歌',
      ar: [{ id: 1, name: '浏览器巡检歌手' }],
      al: { id: 7201, name: '巡检精选专辑', picId: 'album-pic-1', picUrl: COVER_URL },
      dt: 180000,
    },
    {
      id: 7302,
      name: '巡检专辑第二曲',
      ar: [{ id: 1, name: '浏览器巡检歌手' }],
      al: { id: 7201, name: '巡检精选专辑', picId: 'album-pic-1', picUrl: COVER_URL },
      dt: 210000,
    },
  ];
}

async function expectVisible(page, selector, name) {
  await page.locator(selector).first().waitFor({ state: 'visible', timeout: 7000 });
  record(name, true, selector);
}

async function expectText(page, selector, expected, name) {
  await page.locator(selector).first().waitFor({ state: 'visible', timeout: 7000 });
  await page.waitForFunction(
    ({ selector: targetSelector, expectedText }) => {
      const text = document.querySelector(targetSelector)?.textContent ?? '';
      return text.includes(expectedText);
    },
    { selector, expectedText: expected },
    { timeout: 7000 }
  );
  const text = (await page.locator(selector).first().textContent()) ?? '';
  record(name, text.includes(expected), `实际文本：${text.trim()}`);
}

async function expectDomText(page, selector, expected, name) {
  await page.locator(selector).first().waitFor({ state: 'attached', timeout: 7000 });
  await page.waitForFunction(
    ({ selector: targetSelector, expectedText }) => {
      const text = document.querySelector(targetSelector)?.textContent ?? '';
      return text.includes(expectedText);
    },
    { selector, expectedText: expected },
    { timeout: 7000 }
  );
  const text = (await page.locator(selector).first().textContent()) ?? '';
  record(name, text.includes(expected), `实际文本：${text.trim()}`);
}

async function screenshot(page, name) {
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  results.screenshots.push(file);
}

async function measureLayout(page, name) {
  const metrics = await page.evaluate(() => {
    const rect = (selector) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
    };
    return {
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      navbar: rect('.navbar'),
      main: rect('.main-container'),
      playBtn: rect('#playBtn'),
      playlistActionBtn: rect('#playlistActionBtn'),
      indicators: rect('.mobile-page-indicators'),
    };
  });

  const noHorizontalOverflow = metrics.scrollWidth <= metrics.viewportWidth;
  record(`${name}: 无横向溢出`, noHorizontalOverflow, JSON.stringify(metrics));
}

async function expectInViewport(page, selector, name, options = {}) {
  await page.locator(selector).first().waitFor({ state: 'visible', timeout: 7000 });

  const metrics = await page.evaluate(
    ({ targetSelector, avoidSelector }) => {
      const toRect = (selectorValue) => {
        const el = document.querySelector(selectorValue);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          right: rect.right,
          bottom: rect.bottom,
        };
      };

      const intersects = (a, b) => {
        if (!a || !b) return false;
        return !(
          a.right <= b.x ||
          b.right <= a.x ||
          a.bottom <= b.y ||
          b.bottom <= a.y
        );
      };

      const target = toRect(targetSelector);
      const avoid = avoidSelector ? toRect(avoidSelector) : null;
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
      };

      return {
        target,
        avoid,
        viewport,
        inViewport: Boolean(
          target &&
            target.x >= 0 &&
            target.y >= 0 &&
            target.right <= viewport.width &&
            target.bottom <= viewport.height
        ),
        intersectsAvoid: intersects(target, avoid),
      };
    },
    { targetSelector: selector, avoidSelector: options.avoidSelector ?? null }
  );

  record(
    name,
    metrics.inViewport && !metrics.intersectsAvoid,
    JSON.stringify(metrics)
  );
}

async function runDesktopAudit(page) {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await expectVisible(page, '#searchInput', '桌面首屏: 搜索框可见');
  await expectVisible(page, '#playBtn', '桌面首屏: 播放按钮可见');
  await expectVisible(page, '#playlistActionBtn', '桌面首屏: 我的动作按钮可见');
  await measureLayout(page, '桌面首屏');
  await screenshot(page, 'desktop-home');

  await page.locator('#searchInput').fill('巡检');
  await page.locator('#searchBtn').click();
  await expectText(page, '#searchResults .song-item', '浏览器巡检歌曲', '搜索链路: 返回歌曲');
  await page.locator('#searchResults .song-item').first().click();
  await expectText(page, '#currentTitle', '浏览器巡检歌曲', '播放链路: 当前歌曲更新');
  await page.locator('#searchResults .song-item .favorite-btn').first().click();
  await expectDomText(page, '#favoritesCount', '1', '收藏链路: 收藏计数更新');

  await page.locator('.tab-btn[data-tab="ranking"]').click();
  await expectText(page, '#rankingResults .song-item', '巡检热歌榜第一', '排行榜链路: 热歌榜加载');
  await page.locator('.ranking-tab[data-rank="new"]').click();
  await expectText(page, '#rankingResults .song-item', '巡检新歌榜第一', '排行榜链路: 新歌榜切换');

  await page.locator('.tab-btn[data-tab="artist"]').click();
  await page.locator('#artistAreaFilter .filter-btn[data-area="7"]').click();
  await expectText(page, '#artistGrid .artist-card', '浏览器巡检歌手', '歌手链路: 筛选结果可见');
  await page.locator('#artistGrid .artist-card').first().click();
  await expectText(page, '#artistDetailHeader', '浏览器巡检歌手', '歌手链路: 详情可见');
  await page.locator('#backToArtists').click();
  await expectVisible(page, '#artistGrid .artist-card', '歌手链路: 返回列表可见');

  await page.locator('.tab-btn[data-tab="radio"]').click();
  await page.locator('#radioFilter .filter-btn[data-cateid="2001"]').waitFor({ state: 'visible', timeout: 7000 });
  await page.locator('#radioFilter .filter-btn[data-cateid="2001"]').click();
  await expectText(page, '#radioList .radio-item', '浏览器巡检电台', '电台链路: 分类列表可见');
  await page.locator('#radioList .radio-item').first().click();
  await expectText(page, '#radioProgramResults .song-item', '浏览器巡检节目', '电台链路: 节目列表可见');
  await page.locator('#backToRadios').click();
  await expectVisible(page, '#radioList .radio-item', '电台链路: 返回列表可见');

  await page.locator('#playlistActionSelect').selectOption('radio');
  await page.locator('#playlistActionInput').fill('8201');
  await page.locator('#playlistActionBtn').click();
  await expectText(page, '#userPlaylistsList .playlist-item', '浏览器巡检电台', '我的链路: 添加电台');
  await page.locator('#playlistActionSelect').selectOption('playlist');
  await page.locator('#playlistActionInput').fill('https://music.163.com/#/playlist?id=3778678');
  await page.locator('#playlistActionBtn').click();
  await expectText(page, '#parseResults .song-item', '巡检专辑主打歌', '我的链路: 歌单解析');

  await measureLayout(page, '桌面流程后');
  await screenshot(page, 'desktop-after-flow');
}

async function runMobileAudit(page) {
  await page.setViewportSize({ width: 393, height: 851 });
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await expectVisible(page, '#searchInput', '移动搜索页: 搜索框可见');
  await expectInViewport(page, '#searchInput', '移动搜索页: 搜索框在当前视口内');
  await measureLayout(page, '移动搜索页');
  await screenshot(page, 'mobile-home');

  await page.evaluate(() => window.switchMobilePage?.(1));
  await page.waitForTimeout(300);
  await expectInViewport(page, '#playBtn', '移动播放器页: 播放按钮在当前视口内', {
    avoidSelector: '.mobile-page-indicators',
  });
  await screenshot(page, 'mobile-player');

  await page.evaluate(() => window.switchMobilePage?.(2));
  await page.waitForTimeout(300);
  await expectInViewport(page, '#playlistActionBtn', '移动我的页: 动作按钮在当前视口内', {
    avoidSelector: '.mobile-page-indicators',
  });
  await measureLayout(page, '移动我的页');
  await screenshot(page, 'mobile-my-panel');
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const server = await startPreviewServer();
  let browser;

  try {
    await waitForServer(BASE_URL);
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ locale: 'zh-CN' });
    const page = await context.newPage();

    page.on('pageerror', (error) => results.pageErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') results.consoleErrors.push(message.text());
    });

    await installBrowserMocks(page);
    await runDesktopAudit(page);
    await runMobileAudit(page);

    record('浏览器控制台: 无 error 级日志', results.consoleErrors.length === 0, results.consoleErrors.join('\n'));
    record('页面运行时: 无未捕获异常', results.pageErrors.length === 0, results.pageErrors.join('\n'));
  } finally {
    if (browser) await browser.close();
    await closePreviewServer(server);
    results.finishedAt = new Date().toISOString();
    results.passed = results.checks.every((check) => check.ok);
    await fs.writeFile(path.join(OUT_DIR, 'browser-ui-audit.json'), JSON.stringify(results, null, 2));
  }

  console.log(`UI audit passed: ${results.checks.length} checks`);
  console.log(`Report: ${path.join(OUT_DIR, 'browser-ui-audit.json')}`);
}

main().catch(async (error) => {
  results.failedAt = new Date().toISOString();
  results.passed = false;
  results.error = error instanceof Error ? error.message : String(error);
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(path.join(OUT_DIR, 'browser-ui-audit.json'), JSON.stringify(results, null, 2));
  console.error(error);
  process.exit(1);
});
