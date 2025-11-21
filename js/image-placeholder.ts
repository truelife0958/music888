/**
 * 图片加载失败占位符管理器
 *
 * 老王实现：当图片加载失败时自动替换为美观的占位符
 * 功能：
 * - 自动监听所有img元素的error事件
 * - 显示带图标的占位符
 * - 支持不同尺寸和样式
 * - 防止重复处理
 */

export class ImagePlaceholderManager {
  private processedImages: WeakSet<HTMLImageElement> = new WeakSet();
  private observer: MutationObserver | null = null;

  /**
   * 初始化占位符管理器
   */
  public init(): void {
    // 处理现有图片
    this.processExistingImages();

    // 监听新增的图片元素
    this.observeNewImages();

    console.log('✅ 图片占位符管理器已启动');
  }

  /**
   * 处理页面上已存在的所有图片
   */
  private processExistingImages(): void {
    const images = document.querySelectorAll('img');
    images.forEach((img) => {
      if (img instanceof HTMLImageElement) {
        this.attachErrorHandler(img);
      }
    });
  }

  /**
   * 监听新增的图片元素
   */
  private observeNewImages(): void {
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLImageElement) {
            this.attachErrorHandler(node);
          } else if (node instanceof HTMLElement) {
            // 检查新增节点内的图片
            const images = node.querySelectorAll('img');
            images.forEach((img) => {
              if (img instanceof HTMLImageElement) {
                this.attachErrorHandler(img);
              }
            });
          }
        });
      });
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * 为图片附加错误处理器
   */
  private attachErrorHandler(img: HTMLImageElement): void {
    // 避免重复处理
    if (this.processedImages.has(img)) {
      return;
    }

    this.processedImages.add(img);

    // 监听加载错误
    img.addEventListener('error', () => {
      this.handleImageError(img);
    });

    // 如果图片已经加载失败（naturalWidth为0且src不为空）
    if (img.complete && img.naturalWidth === 0 && img.src) {
      this.handleImageError(img);
    }
  }

  /**
   * 处理图片加载失败
   */
  private handleImageError(img: HTMLImageElement): void {
    // 避免处理data URI和已经是占位符的图片
    if (img.src.startsWith('data:') || img.classList.contains('img-placeholder-failed')) {
      return;
    }

    console.log('🖼️ [占位符] 图片加载失败，使用占位符:', img.src);

    // 添加占位符标记类
    img.classList.add('img-placeholder-failed');

    // 创建占位符容器
    const placeholder = document.createElement('div');
    placeholder.className = 'img-placeholder';

    // 根据图片尺寸调整占位符
    const width = img.width || img.offsetWidth || 100;
    const height = img.height || img.offsetHeight || 100;
    placeholder.style.width = `${width}px`;
    placeholder.style.height = `${height}px`;

    // 复制图片的类名（保持样式一致）
    const classesToCopy = Array.from(img.classList).filter(
      (cls) => !cls.includes('placeholder')
    );
    classesToCopy.forEach((cls) => placeholder.classList.add(cls));

    // 添加图标
    placeholder.innerHTML = `
      <div class="img-placeholder-content">
        <i class="fas fa-music"></i>
        <span class="img-placeholder-text">封面加载失败</span>
      </div>
    `;

    // 替换图片
    if (img.parentNode) {
      img.parentNode.replaceChild(placeholder, img);
    }
  }

  /**
   * 销毁管理器
   */
  public destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.processedImages = new WeakSet();
    console.log('✅ 图片占位符管理器已销毁');
  }
}

// 导出单例
export const imagePlaceholderManager = new ImagePlaceholderManager();
