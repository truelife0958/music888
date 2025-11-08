// 使用 globals: true 时不需要导入 describe, it, expect
import {
  debounce,
  throttle,
  formatTime,
  formatArtist,
  shuffleArray,
  clamp,
  isMobile,
  sleep
} from '../utils';

describe('工具函数测试', () => {
  describe('debounce - 防抖函数', () => {
    it('应该延迟执行函数', async () => {
      let counter = 0;
      const debouncedFn = debounce(() => {
        counter++;
      }, 100);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      expect(counter).toBe(0);

      await new Promise(resolve => setTimeout(resolve, 150));
      expect(counter).toBe(1);
    });

    it('应该只执行最后一次调用', async () => {
      let lastValue = '';
      const debouncedFn = debounce((value: string) => {
        lastValue = value;
      }, 100);

      debouncedFn('first');
      debouncedFn('second');
      debouncedFn('third');

      await new Promise(resolve => setTimeout(resolve, 150));
      expect(lastValue).toBe('third');
    });
  });

  describe('throttle - 节流函数', () => {
    it('应该限制执行频率', async () => {
      let counter = 0;
      const throttledFn = throttle(() => {
        counter++;
      }, 100);

      throttledFn();
      throttledFn();
      throttledFn();

      expect(counter).toBe(1);

      await new Promise(resolve => setTimeout(resolve, 150));
      throttledFn();
      expect(counter).toBe(2);
    });
  });

  describe('formatTime - 时间格式化', () => {
    it('应该正确格式化秒数为 mm:ss', () => {
      expect(formatTime(0)).toBe('0:00');
      expect(formatTime(59)).toBe('0:59');
      expect(formatTime(60)).toBe('1:00');
      expect(formatTime(125)).toBe('2:05');
      expect(formatTime(3599)).toBe('59:59');
    });

    it('应该处理小数秒数', () => {
      expect(formatTime(59.9)).toBe('0:59');
      expect(formatTime(60.5)).toBe('1:00');
    });

    it('应该处理负数和无效输入', () => {
      expect(formatTime(-1)).toBe('0:00');
      expect(formatTime(NaN)).toBe('0:00');
      expect(formatTime(Infinity)).toBe('0:00');
    });
  });

  describe('formatArtist - 艺术家格式化', () => {
    it('应该处理字符串艺术家', () => {
      expect(formatArtist('周杰伦')).toBe('周杰伦');
      expect(formatArtist('  周杰伦  ')).toBe('周杰伦');
    });

    it('应该处理数组艺术家', () => {
      expect(formatArtist(['周杰伦', '方文山'])).toBe('周杰伦 / 方文山');
      expect(formatArtist(['周杰伦'])).toBe('周杰伦');
    });

    it('应该处理对象艺术家', () => {
      expect(formatArtist({ name: '周杰伦', id: '123' })).toBe('周杰伦');
      expect(formatArtist([{ name: '周杰伦' }, { name: '方文山' }])).toBe('周杰伦 / 方文山');
    });

    it('应该处理无效输入', () => {
      expect(formatArtist(null)).toBe('未知艺术家');
      expect(formatArtist(undefined)).toBe('未知艺术家');
      expect(formatArtist('')).toBe('未知艺术家');
      expect(formatArtist([])).toBe('未知艺术家');
    });
  });

  describe('shuffleArray - 数组打乱', () => {
    it('应该返回相同长度的数组', () => {
      const arr = [1, 2, 3, 4, 5];
      const shuffled = shuffleArray(arr);
      expect(shuffled.length).toBe(arr.length);
    });

    it('应该包含相同的元素', () => {
      const arr = [1, 2, 3, 4, 5];
      const shuffled = shuffleArray(arr);
      expect(shuffled.sort()).toEqual(arr.sort());
    });

    it('不应该修改原数组', () => {
      const arr = [1, 2, 3, 4, 5];
      const original = [...arr];
      shuffleArray(arr);
      expect(arr).toEqual(original);
    });
  });

  describe('clamp - 数值限制', () => {
    it('应该限制数值在范围内', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it('应该处理边界值', () => {
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(10, 0, 10)).toBe(10);
    });
  });

  describe('sleep - 延迟执行', () => {
    it('应该延迟指定时间', async () => {
      const start = Date.now();
      await sleep(100);
      const end = Date.now();
      expect(end - start).toBeGreaterThanOrEqual(90); // 允许一些误差
    });
  });

  describe('isMobile - 移动设备检测', () => {
    it('应该返回布尔值', () => {
      const result = isMobile();
      expect(typeof result).toBe('boolean');
    });
  });
});