/**
 * 音质选择增强模块
 * 功能:
 * 1. 在设置中保存默认音质偏好
 * 2. 音质降级时提供详细提示
 * 3. 音质选择记忆功能
 */

import * as ui from './ui.js';

// 音质配置
const QUALITY_CONFIG = {
    STORAGE_KEY: 'yt_default_quality',
    QUALITIES: [
        { value: '128', label: '标准 128K', size: '约3-4MB/首' },
        { value: '192', label: '较高 192K', size: '约4-5MB/首' },
        { value: '320', label: '高品质 320K', size: '约8-10MB/首' },
        { value: '740', label: '无损 FLAC', size: '约20-40MB/首' },
        { value: '999', label: 'Hi-Res', size: '约50-100MB/首' }
    ]
};

// 初始化音质选择器
export function initQualitySelector(): void {
    const qualitySelect = document.getElementById('qualitySelect') as HTMLSelectElement;
    if (!qualitySelect) {
        return;
    }

    // 从localStorage加载默认音质
    const savedQuality = loadDefaultQuality();
    if (savedQuality) {
        qualitySelect.value = savedQuality;
    }

    // 监听音质变化
    qualitySelect.addEventListener('change', () => {
        const selectedQuality = qualitySelect.value;
        saveDefaultQuality(selectedQuality);
        
        const qualityInfo = getQualityInfo(selectedQuality);
        ui.showNotification(`已切换到 ${qualityInfo.label}`, 'success');
    });

    // 在设置面板中添加默认音质设置
    addQualitySettingToPanel();

    // 显示当前音质提示
    showQualityTooltip(qualitySelect);
}

// 保存默认音质
function saveDefaultQuality(quality: string): void {
    try {
        localStorage.setItem(QUALITY_CONFIG.STORAGE_KEY, quality);
    } catch (error) {
        console.error('保存音质设置失败:', error);
    }
}

// 加载默认音质
function loadDefaultQuality(): string | null {
    try {
        return localStorage.getItem(QUALITY_CONFIG.STORAGE_KEY);
    } catch (error) {
        console.error('加载音质设置失败:', error);
        return null;
    }
}

// 获取音质信息
function getQualityInfo(quality: string): { value: string; label: string; size: string } {
    const qualityInfo = QUALITY_CONFIG.QUALITIES.find(q => q.value === quality);
    return qualityInfo || QUALITY_CONFIG.QUALITIES[2]; // 默认320K
}

// 在设置面板中添加音质设置
function addQualitySettingToPanel(): void {
    const settingsModalBody = document.querySelector('.settings-modal-body');
    if (!settingsModalBody) return;

    // 查找播放设置区块
    const playSection = Array.from(settingsModalBody.querySelectorAll('.settings-section'))
        .find(section => section.querySelector('.settings-section-title')?.textContent?.includes('播放设置'));

    if (!playSection) return;

    // 检查是否已添加
    if (playSection.querySelector('#defaultQualitySelect')) return;

    // 创建音质设置项
    const qualitySettingHTML = `
        <div class="settings-item">
            <label for="defaultQualitySelect">默认音质</label>
            <select id="defaultQualitySelect" class="settings-select">
                ${QUALITY_CONFIG.QUALITIES.map(q => 
                    `<option value="${q.value}">${q.label}</option>`
                ).join('')}
            </select>
            <div style="font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 4px;">
                <i class="fas fa-info-circle"></i> 较高音质需要更多流量和存储空间
            </div>
        </div>
    `;

    playSection.insertAdjacentHTML('beforeend', qualitySettingHTML);

    // 绑定事件
    const defaultQualitySelect = document.getElementById('defaultQualitySelect') as HTMLSelectElement;
    if (defaultQualitySelect) {
        // 设置当前值
        const savedQuality = loadDefaultQuality();
        if (savedQuality) {
            defaultQualitySelect.value = savedQuality;
        }

        // 监听变化
        defaultQualitySelect.addEventListener('change', () => {
            const selectedQuality = defaultQualitySelect.value;
            saveDefaultQuality(selectedQuality);

            // 同步更新播放器的音质选择器
            const qualitySelect = document.getElementById('qualitySelect') as HTMLSelectElement;
            if (qualitySelect) {
                qualitySelect.value = selectedQuality;
            }

            const qualityInfo = getQualityInfo(selectedQuality);
            ui.showNotification(`默认音质已设置为 ${qualityInfo.label}`, 'success');
        });
    }
}

// 显示音质提示
function showQualityTooltip(selectElement: HTMLSelectElement): void {
    selectElement.addEventListener('mouseenter', () => {
        const quality = selectElement.value;
        const qualityInfo = getQualityInfo(quality);
        selectElement.title = `${qualityInfo.label}\n文件大小: ${qualityInfo.size}`;
    });
}

// 获取音质降级提示信息
export function getQualityFallbackMessage(requestedQuality: string, actualQuality: string): string {
    const requested = getQualityInfo(requestedQuality);
    const actual = getQualityInfo(actualQuality);
    
    return `原音质 ${requested.label} 不可用，已自动切换到 ${actual.label}`;
}

// 导出默认音质
export function getDefaultQuality(): string {
    return loadDefaultQuality() || '740'; // 默认无损
}