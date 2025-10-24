/**
 * 工具函数单元测试
 */

import { describe, it, expect } from 'vitest';
import {
    debounce,
    throttle,
    formatTime,
    safeJSONParse,
    storage,
    formatErrorMessage,
    shuffleArray,
    clamp,
} from '../js/utils';

describe('Utils - debounce', () => {
    it('应该延迟执行函数', async () => {
        let count = 0;
        const debouncedFn = debounce(() => count++, 100);

        debouncedFn();
        debouncedFn();
        debouncedFn();

        expect(count).toBe(0);

        await new Promise(resolve => setTimeout(resolve, 150));
        expect(count).toBe(1);
    });
});

describe('Utils - throttle', () => {
    it('应该限制函数执行频率', async () => {
        let count = 0;
        const throttledFn = throttle(() => count++, 100);

        throttledFn();
        throttledFn();
        throttledFn();

        expect(count).toBe(1);

        await new Promise(resolve => setTimeout(resolve, 150));
        throttledFn();
        expect(count).toBe(2);
    });
});

describe('Utils - formatTime', () => {
    it('应该正确格式化时间', () => {
        expect(formatTime(0)).toBe('0:00');
        expect(formatTime(30)).toBe('0:30');
        expect(formatTime(90)).toBe('1:30');
        expect(formatTime(3661)).toBe('61:01');
    });

    it('应该处理无效输入', () => {
        expect(formatTime(-1)).toBe('0:00');
        expect(formatTime(Infinity)).toBe('0:00');
        expect(formatTime(NaN)).toBe('0:00');
    });
});

describe('Utils - safeJSONParse', () => {
    it('应该正确解析 JSON', () => {
        const result = safeJSONParse('{"name":"test"}', {});
        expect(result).toEqual({ name: 'test' });
    });

    it('应该在解析失败时返回默认值', () => {
        const result = safeJSONParse('invalid json', { default: true });
        expect(result).toEqual({ default: true });
    });
});

describe('Utils - storage', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('应该能够存储和读取数据', () => {
        storage.set('test', { value: 123 });
        const result = storage.get('test', { value: 0 });
        expect(result).toEqual({ value: 123 });
    });

    it('应该在键不存在时返回默认值', () => {
        const result = storage.get('nonexistent', { default: true });
        expect(result).toEqual({ default: true });
    });

    it('应该能够删除数据', () => {
        storage.set('test', 'value');
        storage.remove('test');
        const result = storage.get('test', null);
        expect(result).toBeNull();
    });

    it('应该能够清空所有数据', () => {
        storage.set('key1', 'value1');
        storage.set('key2', 'value2');
        storage.clear();
        expect(storage.get('key1', null)).toBeNull();
        expect(storage.get('key2', null)).toBeNull();
    });
});

describe('Utils - formatErrorMessage', () => {
    it('应该格式化 Error 对象', () => {
        const error = new Error('Test error');
        const result = formatErrorMessage(error, 'Context');
        expect(result).toBe('Context: Test error');
    });

    it('应该识别版权错误', () => {
        const error = new Error('版权保护');
        const result = formatErrorMessage(error);
        expect(result).toContain('版权保护');
    });

    it('应该识别网络超时', () => {
        const error = new Error('timeout');
        const result = formatErrorMessage(error);
        expect(result).toContain('网络超时');
    });

    it('应该处理字符串错误', () => {
        const result = formatErrorMessage('String error');
        expect(result).toBe('String error');
    });

    it('应该处理未知错误', () => {
        const result = formatErrorMessage(null);
        expect(result).toBe('未知错误');
    });
});

describe('Utils - shuffleArray', () => {
    it('应该打乱数组顺序', () => {
        const original = [1, 2, 3, 4, 5];
        const shuffled = shuffleArray(original);

        expect(shuffled).toHaveLength(original.length);
        expect(shuffled).toEqual(expect.arrayContaining(original));
        expect(original).toEqual([1, 2, 3, 4, 5]); // 原数组不变
    });

    it('应该处理空数组', () => {
        const result = shuffleArray([]);
        expect(result).toEqual([]);
    });
});

describe('Utils - clamp', () => {
    it('应该限制数字在范围内', () => {
        expect(clamp(5, 0, 10)).toBe(5);
        expect(clamp(-5, 0, 10)).toBe(0);
        expect(clamp(15, 0, 10)).toBe(10);
    });

    it('应该处理边界值', () => {
        expect(clamp(0, 0, 10)).toBe(0);
        expect(clamp(10, 0, 10)).toBe(10);
    });
});
