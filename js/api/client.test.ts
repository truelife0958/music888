import { describe, expect, it } from 'vitest';
import { toPlayableMediaUrl, toProxyUrl } from './client';

describe('toPlayableMediaUrl', () => {
    it('空字符串应返回空字符串', () => {
        expect(toPlayableMediaUrl('')).toBe('');
    });

    it('应保留 data 和 blob URL', () => {
        expect(toPlayableMediaUrl('data:audio/mp3;base64,abc123')).toBe('data:audio/mp3;base64,abc123');
        expect(toPlayableMediaUrl('blob:https://music888.example/abc-123')).toBe('blob:https://music888.example/abc-123');
    });

    it('已代理地址应原样返回', () => {
        const proxyUrl = '/api/proxy?url=https%3A%2F%2Fcdn.example.com%2Fsong.mp3';
        expect(toPlayableMediaUrl(proxyUrl)).toBe(proxyUrl);
    });

    it('应将 http 和协议相对地址升级为 https 后再代理', () => {
        expect(toPlayableMediaUrl('http://cdn.example.com/song.mp3')).toBe(
            toProxyUrl('https://cdn.example.com/song.mp3')
        );
        expect(toPlayableMediaUrl('//cdn.example.com/song.mp3')).toBe(
            toProxyUrl('https://cdn.example.com/song.mp3')
        );
    });

    it('应将 https 外部地址包装为代理地址', () => {
        expect(toPlayableMediaUrl('https://cdn.example.com/song.mp3')).toBe(
            toProxyUrl('https://cdn.example.com/song.mp3')
        );
    });
});
