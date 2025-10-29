/**
 * PWA增强功能
 * 改善离线支持、添加安装提示、缓存管理
 */

let deferredPrompt: any = null;
let isInitialized = false;

/**
 * 初始化PWA增强功能
 */
export function initPWAEnhanced(): void {
    if (isInitialized) return;
    
    addInstallButton();
    setupInstallPrompt();
    setupServiceWorkerUpdate();
    checkOnlineStatus();
    
    isInitialized = true;
    console.log('PWA增强功能已初始化');
}

/**
 * 添加安装按钮
 */
function addInstallButton(): void {
    const settingsBtn = document.querySelector('.settings-btn');
    if (!settingsBtn || document.querySelector('.pwa-install-btn')) return;
    
    const installBtn = document.createElement('button');
    installBtn.className = 'pwa-install-btn';
    installBtn.style.display = 'none'; // 默认隐藏
    installBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M13,5V11H14.17L12,13.17L9.83,11H11V5H13M15,3H9V9H5L12,16L19,9H15V3M19,18H5V20H19V18Z"/>
        </svg>
    `;
    installBtn.title = '安装应用';
    installBtn.addEventListener('click', handleInstallClick);
    
    settingsBtn.parentElement?.insertBefore(installBtn, settingsBtn);
}

/**
 * 设置安装提示
 */
function setupInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        // 显示安装按钮
        const installBtn = document.querySelector('.pwa-install-btn') as HTMLElement;
        if (installBtn) {
            installBtn.style.display = 'flex';
        }
        
        console.log('PWA安装提示已准备');
    });
    
    // 监听安装完成
    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        const installBtn = document.querySelector('.pwa-install-btn') as HTMLElement;
        if (installBtn) {
            installBtn.style.display = 'none';
        }
        showNotification('应用已成功安装！', 'success');
    });
}

/**
 * 处理安装点击
 */
async function handleInstallClick(): Promise<void> {
    if (!deferredPrompt) {
        showNotification('此应用已安装或不支持安装', 'info');
        return;
    }
    
    // 显示安装提示
    deferredPrompt.prompt();
    
    // 等待用户响应
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
        showNotification('感谢安装！', 'success');
    } else {
        showNotification('安装已取消', 'info');
    }
    
    deferredPrompt = null;
    const installBtn = document.querySelector('.pwa-install-btn') as HTMLElement;
    if (installBtn) {
        installBtn.style.display = 'none';
    }
}

/**
 * 设置Service Worker更新检测
 */
function setupServiceWorkerUpdate(): void {
    if (!('serviceWorker' in navigator)) return;
    
    navigator.serviceWorker.ready.then(registration => {
        // 每小时检查一次更新
        setInterval(() => {
            registration.update();
        }, 60 * 60 * 1000);
        
        // 监听更新
        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (!newWorker) return;
            
            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // 有新版本可用
                    showUpdateNotification();
                }
            });
        });
    });
}

/**
 * 显示更新通知
 */
function showUpdateNotification(): void {
    const notification = document.createElement('div');
    notification.className = 'pwa-update-notification';
    notification.innerHTML = `
        <div class="update-content">
            <i class="fas fa-info-circle"></i>
            <span>发现新版本！</span>
            <button class="update-btn">更新</button>
            <button class="dismiss-btn">×</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // 更新按钮
    notification.querySelector('.update-btn')?.addEventListener('click', () => {
        window.location.reload();
    });
    
    // 关闭按钮
    notification.querySelector('.dismiss-btn')?.addEventListener('click', () => {
        notification.remove();
    });
    
    // 5秒后自动隐藏
    setTimeout(() => {
        notification.classList.add('fadeout');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

/**
 * 检查在线状态
 */
function checkOnlineStatus(): void {
    const updateOnlineStatus = () => {
        const isOnline = navigator.onLine;
        const statusIndicator = document.querySelector('.online-status-indicator');
        
        if (!statusIndicator) {
            createStatusIndicator();
        }
        
        if (!isOnline) {
            showNotification('您已离线，部分功能可能受限', 'warning');
        } else {
            const indicator = document.querySelector('.online-status-indicator');
            if (indicator?.classList.contains('offline')) {
                showNotification('已重新连接到网络', 'success');
            }
        }
        
        updateStatusIndicator(isOnline);
    };
    
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    updateOnlineStatus();
}

/**
 * 创建状态指示器
 */
function createStatusIndicator(): void {
    const indicator = document.createElement('div');
    indicator.className = 'online-status-indicator';
    indicator.innerHTML = `
        <div class="status-dot"></div>
        <span class="status-text"></span>
    `;
    
    document.body.appendChild(indicator);
}

/**
 * 更新状态指示器
 */
function updateStatusIndicator(isOnline: boolean): void {
    const indicator = document.querySelector('.online-status-indicator');
    const text = indicator?.querySelector('.status-text');
    
    if (!indicator || !text) return;
    
    if (isOnline) {
        indicator.classList.remove('offline');
        indicator.classList.add('online');
        text.textContent = '在线';
    } else {
        indicator.classList.remove('online');
        indicator.classList.add('offline');
        text.textContent = '离线';
    }
}

/**
 * 显示通知（使用现有的通知系统）
 */
function showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
    const event = new CustomEvent('showNotification', {
        detail: { message, type }
    });
    window.dispatchEvent(event);
}

/**
 * 清除应用缓存
 */
export async function clearAppCache(): Promise<boolean> {
    try {
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
            showNotification('缓存已清除', 'success');
            return true;
        }
        return false;
    } catch (error) {
        console.error('清除缓存失败:', error);
        showNotification('清除缓存失败', 'error');
        return false;
    }
}

/**
 * 获取缓存大小（估算）
 */
export async function getCacheSize(): Promise<string> {
    try {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate();
            const usage = estimate.usage || 0;
            return formatBytes(usage);
        }
        return '未知';
    } catch (error) {
        console.error('获取缓存大小失败:', error);
        return '未知';
    }
}

/**
 * 格式化字节数
 */
function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}