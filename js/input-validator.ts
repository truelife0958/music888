// js/input-validator.ts - 输入验证工具

/**
 * 输入验证配置
 */
export const INPUT_LIMITS = {
    SEARCH_KEYWORD_MAX: 100,      // 搜索关键词最大长度
    PLAYLIST_ID_MAX: 50,          // 歌单ID最大长度
    ARTIST_NAME_MAX: 50,          // 歌手名最大长度
    SONG_NAME_MAX: 200,           // 歌曲名最大长度
    GENERIC_TEXT_MAX: 500,        // 通用文本最大长度
};

/**
 * 验证并清理搜索关键词
 */
export function validateSearchKeyword(keyword: string): { valid: boolean; value: string; error?: string } {
    if (!keyword || typeof keyword !== 'string') {
        return { valid: false, value: '', error: '请输入搜索关键词' };
    }
    
    const trimmed = keyword.trim();
    
    if (trimmed.length === 0) {
        return { valid: false, value: '', error: '搜索关键词不能为空' };
    }
    
    if (trimmed.length > INPUT_LIMITS.SEARCH_KEYWORD_MAX) {
        return { 
            valid: false, 
            value: trimmed.substring(0, INPUT_LIMITS.SEARCH_KEYWORD_MAX), 
            error: `搜索关键词不能超过${INPUT_LIMITS.SEARCH_KEYWORD_MAX}个字符` 
        };
    }
    
    // 移除特殊控制字符
    const cleaned = trimmed.replace(/[\x00-\x1F\x7F]/g, '');
    
    return { valid: true, value: cleaned };
}

/**
 * 验证歌单ID
 */
export function validatePlaylistId(playlistId: string): { valid: boolean; value: string; error?: string } {
    if (!playlistId || typeof playlistId !== 'string') {
        return { valid: false, value: '', error: '请输入歌单ID或链接' };
    }
    
    const trimmed = playlistId.trim();
    
    if (trimmed.length === 0) {
        return { valid: false, value: '', error: '歌单ID不能为空' };
    }
    
    if (trimmed.length > INPUT_LIMITS.PLAYLIST_ID_MAX) {
        return { 
            valid: false, 
            value: trimmed.substring(0, INPUT_LIMITS.PLAYLIST_ID_MAX), 
            error: `歌单ID不能超过${INPUT_LIMITS.PLAYLIST_ID_MAX}个字符` 
        };
    }
    
    // 尝试从链接中提取ID
    const urlMatch = trimmed.match(/(?:id=|playlist\/)(\d+)/);
    if (urlMatch) {
        return { valid: true, value: urlMatch[1] };
    }
    
    // 验证是否为纯数字ID
    if (!/^\d+$/.test(trimmed)) {
        return { valid: false, value: trimmed, error: '无效的歌单ID格式' };
    }
    
    return { valid: true, value: trimmed };
}

/**
 * 验证歌手名称
 */
export function validateArtistName(artistName: string): { valid: boolean; value: string; error?: string } {
    if (!artistName || typeof artistName !== 'string') {
        return { valid: false, value: '', error: '请输入歌手名' };
    }
    
    const trimmed = artistName.trim();
    
    if (trimmed.length === 0) {
        return { valid: false, value: '', error: '歌手名不能为空' };
    }
    
    if (trimmed.length > INPUT_LIMITS.ARTIST_NAME_MAX) {
        return { 
            valid: false, 
            value: trimmed.substring(0, INPUT_LIMITS.ARTIST_NAME_MAX), 
            error: `歌手名不能超过${INPUT_LIMITS.ARTIST_NAME_MAX}个字符` 
        };
    }
    
    // 移除特殊控制字符
    const cleaned = trimmed.replace(/[\x00-\x1F\x7F]/g, '');
    
    return { valid: true, value: cleaned };
}

/**
 * HTML转义（防止XSS）
 */
export function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 清理URL（防止javascript:伪协议）
 */
export function sanitizeUrl(url: string): string {
    const trimmed = url.trim().toLowerCase();
    
    // 阻止危险协议
    if (trimmed.startsWith('javascript:') || 
        trimmed.startsWith('data:') || 
        trimmed.startsWith('vbscript:')) {
        return '';
    }
    
    return url.trim();
}

/**
 * 验证通用文本输入
 */
export function validateTextInput(text: string, maxLength: number = INPUT_LIMITS.GENERIC_TEXT_MAX): { valid: boolean; value: string; error?: string } {
    if (typeof text !== 'string') {
        return { valid: false, value: '', error: '输入必须为文本' };
    }
    
    const trimmed = text.trim();
    
    if (trimmed.length > maxLength) {
        return { 
            valid: false, 
            value: trimmed.substring(0, maxLength), 
            error: `输入不能超过${maxLength}个字符` 
        };
    }
    
    // 移除特殊控制字符
    const cleaned = trimmed.replace(/[\x00-\x1F\x7F]/g, '');
    
    return { valid: true, value: cleaned };
}