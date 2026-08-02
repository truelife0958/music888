import { describe, expect, it } from 'vitest';
import { FALLBACK_SOURCES } from './utils';
import { MUSIC_SOURCE_CANDIDATES, getPreferredSearchSources } from './sources';

describe('音乐源能力列表', () => {
    it('只应包含当前支持搜索和播放的 GDStudio 源（kuwo URL 解析不稳定已移除）', () => {
        expect(MUSIC_SOURCE_CANDIDATES).toEqual(['netease', 'joox', 'bilibili']);
        expect(FALLBACK_SOURCES).toEqual(['joox', 'bilibili']);
    });

    it('应始终把用户指定源放在首位并限制并发数量', () => {
        expect(getPreferredSearchSources('joox', 2)).toHaveLength(2);
        expect(getPreferredSearchSources('joox', 2)[0]).toBe('joox');
        expect(getPreferredSearchSources('netease', 0)).toEqual(['netease']);
    });
});
