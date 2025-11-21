/**
 * 骨架屏生成器
 *
 * 老王实现：在内容加载时显示骨架屏，提升用户体验
 * 功能：
 * - 生成歌曲列表骨架屏
 * - 生成卡片骨架屏
 * - 自动显示和隐藏
 */

/**
 * 生成歌曲列表骨架屏
 * @param count - 骨架屏数量
 * @returns HTML字符串
 */
export function generateSongListSkeleton(count: number = 5): string {
  const skeletons = [];

  for (let i = 0; i < count; i++) {
    skeletons.push(`
      <div class="skeleton-song-item">
        <div class="skeleton skeleton-song-cover"></div>
        <div class="skeleton-song-info">
          <div class="skeleton skeleton-song-title"></div>
          <div class="skeleton skeleton-song-artist"></div>
        </div>
        <div class="skeleton-song-actions">
          <div class="skeleton skeleton-btn"></div>
          <div class="skeleton skeleton-btn"></div>
        </div>
      </div>
    `);
  }

  return `<div class="skeleton-search-results">${skeletons.join('')}</div>`;
}

/**
 * 生成卡片骨架屏
 * @param count - 骨架屏数量
 * @returns HTML字符串
 */
export function generateCardSkeleton(count: number = 3): string {
  const skeletons = [];

  for (let i = 0; i < count; i++) {
    skeletons.push(`
      <div class="skeleton-card">
        <div class="skeleton skeleton-card-header"></div>
        <div class="skeleton skeleton-card-content"></div>
        <div class="skeleton skeleton-card-footer"></div>
      </div>
    `);
  }

  return skeletons.join('');
}

/**
 * 生成文本骨架屏
 * @param lineCount - 行数
 * @returns HTML字符串
 */
export function generateTextSkeleton(lineCount: number = 3): string {
  const lines = [];

  for (let i = 0; i < lineCount; i++) {
    const widthClass = i === lineCount - 1 ? 'skeleton-text-short' : 'skeleton-text';
    lines.push(`<div class="skeleton ${widthClass}"></div>`);
  }

  return lines.join('');
}

/**
 * 在容器中显示骨架屏
 * @param containerId - 容器ID
 * @param skeletonHtml - 骨架屏HTML
 */
export function showSkeleton(containerId: string, skeletonHtml: string): void {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = skeletonHtml;
  }
}

/**
 * 在容器中显示歌曲列表骨架屏
 * @param containerId - 容器ID
 * @param count - 骨架屏数量
 */
export function showSongListSkeleton(containerId: string, count: number = 5): void {
  showSkeleton(containerId, generateSongListSkeleton(count));
}

/**
 * 在容器中显示卡片骨架屏
 * @param containerId - 容器ID
 * @param count - 骨架屏数量
 */
export function showCardSkeleton(containerId: string, count: number = 3): void {
  showSkeleton(containerId, generateCardSkeleton(count));
}

/**
 * 隐藏骨架屏（清空容器）
 * @param containerId - 容器ID
 */
export function hideSkeleton(containerId: string): void {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = '';
  }
}
