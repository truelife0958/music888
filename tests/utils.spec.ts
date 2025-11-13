import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  debounce,
  throttle,
  formatTime,
  safeJSONParse,
  storage,
  formatErrorMessage,
  ErrorType,
  sleep,
  shuffleArray,
  clamp,
  isMobile,
  formatArtist,
  generateSongFileName,
  copyToClipboard,
  renderPlaylistItem,
  renderEmptyState,
} from '../js/utils';

describe('Utils - 防抖和节流', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('debounce 应该延迟执行函数', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100);

    debouncedFn();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('debounce 应该只执行最后一次调用', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100);

    debouncedFn('call1');
    debouncedFn('call2');
    debouncedFn('call3');

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('call3');
  });

  test('throttle 应该限制执行频率', () => {
    const fn = vi.fn();
    const throttledFn = throttle(fn, 100);

    throttledFn();
    expect(fn).toHaveBeenCalledTimes(1);

    throttledFn();
    expect(fn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(100);
    throttledFn();
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('Utils - 时间格式化', () => {
  test('formatTime 应该正确格式化秒数', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(30)).toBe('0:30');
    expect(formatTime(60)).toBe('1:00');
    expect(formatTime(90)).toBe('1:30');
    expect(formatTime(3600)).toBe('60:00');
    expect(formatTime(3661)).toBe('61:01');
  });

  test('formatTime 应该处理无效输入', () => {
    expect(formatTime(-1)).toBe('0:00');
    expect(formatTime(NaN)).toBe('0:00');
    expect(formatTime(Infinity)).toBe('0:00');
  });
});

describe('Utils - JSON 解析', () => {
  test('safeJSONParse 应该解析有效的 JSON', () => {
    const obj = { name: '测试', value: 123 };
    const result = safeJSONParse(JSON.stringify(obj), {});
    expect(result).toEqual(obj);
  });

  test('safeJSONParse 应该在解析失败时返回默认值', () => {
    const defaultValue = { default: true };
    const result = safeJSONParse('invalid json', defaultValue);
    expect(result).toEqual(defaultValue);
  });

  test('safeJSONParse 应该处理空字符串', () => {
    const result = safeJSONParse('', null);
    expect(result).toBe(null);
  });
});

describe('Utils - Storage 操作', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  test('storage.set 和 storage.get 应该正常工作', () => {
    const testData = { name: '测试', count: 42 };
    const result = storage.set('test-key', testData);
    expect(result).toBe(true);

    const retrieved = storage.get('test-key', {});
    expect(retrieved).toEqual(testData);
  });

  test('storage.get 应该在键不存在时返回默认值', () => {
    const defaultValue = { default: true };
    const result = storage.get('non-existent', defaultValue);
    expect(result).toEqual(defaultValue);
  });

  test('storage.remove 应该删除键', () => {
    storage.set('test-key', { data: 'test' });
    const removed = storage.remove('test-key');
    expect(removed).toBe(true);

    const result = storage.get('test-key', null);
    expect(result).toBe(null);
  });

  test('storage.clear 应该清空所有数据', () => {
    storage.set('key1', 'value1');
    storage.set('key2', 'value2');
    const cleared = storage.clear();
    expect(cleared).toBe(true);
    expect(localStorage.length).toBe(0);
  });

  test('storage.set 应该处理复杂对象', () => {
    const complexData = {
      nested: { value: 123 },
      array: [1, 2, 3],
      string: 'test',
    };
    storage.set('complex', complexData);
    const retrieved = storage.get('complex', {});
    expect(retrieved).toEqual(complexData);
  });
});

describe('Utils - 错误处理', () => {
  test('formatErrorMessage 应该格式化 Error 对象', () => {
    const error = new Error('Test error');
    const message = formatErrorMessage(error, '测试上下文');
    expect(message).toContain('测试上下文');
    expect(message).toContain('Test error');
  });

  test('formatErrorMessage 应该检测版权错误', () => {
    const message = formatErrorMessage('版权保护', '播放');
    expect(message).toContain('版权保护');
  });

  test('formatErrorMessage 应该检测超时错误', () => {
    const message = formatErrorMessage('timeout', '请求');
    expect(message).toContain('网络超时');
  });

  test('formatErrorMessage 应该检测网络错误', () => {
    const message = formatErrorMessage('network failed', '');
    expect(message).toContain('网络');
  });

  test('formatErrorMessage 应该处理字符串错误', () => {
    const message = formatErrorMessage('简单错误', '');
    expect(message).toBe('简单错误');
  });

  test('formatErrorMessage 应该处理空资源错误', () => {
    const message = formatErrorMessage('空url', '');
    expect(message).toContain('音乐源无此资源');
  });

  test('ErrorType 枚举应该包含所有类型', () => {
    expect(ErrorType.COPYRIGHT).toBeDefined();
    expect(ErrorType.EMPTY_RESOURCE).toBeDefined();
    expect(ErrorType.TIMEOUT).toBeDefined();
    expect(ErrorType.NETWORK).toBeDefined();
    expect(ErrorType.PARSE).toBeDefined();
    expect(ErrorType.UNKNOWN).toBeDefined();
  });
});

describe('Utils - 辅助函数', () => {
  test('sleep 应该延迟指定时间', async () => {
    const start = Date.now();
    await sleep(100);
    const end = Date.now();
    expect(end - start).toBeGreaterThanOrEqual(95);
  });

  test('shuffleArray 应该打乱数组', () => {
    const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const shuffled = shuffleArray(original);

    expect(shuffled).toHaveLength(original.length);
    expect(shuffled).toEqual(expect.arrayContaining(original));
    expect(original).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  test('shuffleArray 应该处理空数组', () => {
    const result = shuffleArray([]);
    expect(result).toEqual([]);
  });

  test('clamp 应该限制数值范围', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });

  test('isMobile 应该检测移动设备', () => {
    const result = isMobile();
    expect(typeof result).toBe('boolean');
  });
});

describe('Utils - 艺术家格式化', () => {
  test('formatArtist 应该处理字符串', () => {
    expect(formatArtist('周杰伦')).toBe('周杰伦');
  });

  test('formatArtist 应该处理字符串数组', () => {
    expect(formatArtist(['周杰伦', '方文山'])).toBe('周杰伦 / 方文山');
  });

  test('formatArtist 应该处理对象', () => {
    expect(formatArtist({ name: '周杰伦', id: '123' })).toBe('周杰伦');
  });

  test('formatArtist 应该处理对象数组', () => {
    const artists = [
      { name: '周杰伦', id: '1' },
      { name: '方文山', id: '2' },
    ];
    expect(formatArtist(artists)).toBe('周杰伦 / 方文山');
  });

  test('formatArtist 应该处理空值', () => {
    expect(formatArtist(null)).toBe('未知艺术家');
    expect(formatArtist(undefined)).toBe('未知艺术家');
    expect(formatArtist('')).toBe('未知艺术家');
    expect(formatArtist([])).toBe('未知艺术家');
  });

  test('formatArtist 应该过滤无效值', () => {
    expect(formatArtist(['', 'null', '周杰伦', 'undefined'])).toBe('周杰伦');
  });

  test('formatArtist 应该处理包含空字符串的数组', () => {
    expect(formatArtist(['周杰伦', '', '方文山'])).toBe('周杰伦 / 方文山');
  });

  test('formatArtist 应该处理特殊字符串', () => {
    expect(formatArtist('[object Object]')).toBe('未知艺术家');
  });
});

describe('Utils - 文件名生成', () => {
  test('generateSongFileName 应该生成正确的文件名', () => {
    const song = { name: '晴天', artist: '周杰伦' };
    const filename = generateSongFileName(song);
    expect(filename).toBe('晴天 - 周杰伦.mp3');
  });

  test('generateSongFileName 应该支持自定义扩展名', () => {
    const song = { name: '晴天', artist: '周杰伦' };
    const filename = generateSongFileName(song, '.lrc');
    expect(filename).toBe('晴天 - 周杰伦.lrc');
  });

  test('generateSongFileName 应该清理非法字符', () => {
    const song = { name: '晴天/雨天', artist: '周杰伦<artist>' };
    const filename = generateSongFileName(song);
    expect(filename).not.toContain('/');
    expect(filename).not.toContain('<');
    expect(filename).not.toContain('>');
  });

  test('generateSongFileName 应该处理数组艺术家', () => {
    const song = { name: '稻香', artist: ['周杰伦'] };
    const filename = generateSongFileName(song);
    expect(filename).toBe('稻香 - 周杰伦.mp3');
  });

  test('generateSongFileName 应该处理空歌曲名', () => {
    const song = { name: '', artist: '周杰伦' };
    const filename = generateSongFileName(song);
    expect(filename).toContain('周杰伦');
  });
});

describe('Utils - 剪贴板操作', () => {
  test('copyToClipboard 应该处理无效输入', async () => {
    const result = await copyToClipboard('');
    expect(result).toBe(false);
  });

  test('copyToClipboard 应该尝试复制文本', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    const result = await copyToClipboard('测试文本');
    expect(result).toBe(true);
    expect(writeTextMock).toHaveBeenCalledWith('测试文本');
  });
});

describe('Utils - HTML 渲染函数', () => {
  test('renderPlaylistItem 应该生成正确的 HTML', () => {
    const html = renderPlaylistItem('我的歌单', 10, 'fas fa-music', '#1db954');
    expect(html).toContain('我的歌单');
    expect(html).toContain('10首');
    expect(html).toContain('fas fa-music');
    expect(html).toContain('#1db954');
  });

  test('renderPlaylistItem 应该使用默认颜色', () => {
    const html = renderPlaylistItem('我的歌单', 5, 'fas fa-music');
    expect(html).toContain('#1db954');
  });

  test('renderEmptyState 应该生成空状态 HTML', () => {
    const html = renderEmptyState('fas fa-inbox', '暂无数据');
    expect(html).toContain('fas fa-inbox');
    expect(html).toContain('暂无数据');
  });

  test('renderEmptyState 应该支持可选的提示信息', () => {
    const html = renderEmptyState('fas fa-inbox', '暂无数据', '请先添加歌曲');
    expect(html).toContain('请先添加歌曲');
  });
});