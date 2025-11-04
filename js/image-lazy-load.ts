// js/image-lazy-load.ts - 图片懒加载优化

export class ImageLazyLoader {
    private observer: IntersectionObserver | null = null;
    private images: Set<HTMLImageElement> = new Set();

    constructor() {
        // 检查浏览器是否支持 IntersectionObserver
        if ('IntersectionObserver' in window) {
            this.observer = new IntersectionObserver(
                (entries) => this.handleIntersection(entries),
                {
                    root: null,
                    rootMargin: '50px', // 提前50px开始加载
                    threshold: 0.01
                }
            );
        }
    }

    private handleIntersection(entries: IntersectionObserverEntry[]): void {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target as HTMLImageElement;
                this.loadImage(img);
                this.observer?.unobserve(img);
                this.images.delete(img);
            }
        });
    }

    private loadImage(img: HTMLImageElement): void {
        const src = img.dataset.src;
        if (!src) return;

        // 显示加载占位符
        img.classList.add('loading');

        // 创建新图片对象预加载
        const tempImg = new Image();
        
        tempImg.onload = () => {
            img.src = src;
            img.classList.remove('loading');
            img.classList.add('loaded');
            delete img.dataset.src;
        };

        tempImg.onerror = () => {
            // 加载失败，使用默认图片
            img.src = this.getDefaultImage();
            img.classList.remove('loading');
            img.classList.add('error');
            delete img.dataset.src;
        };

        tempImg.src = src;
    }

    private getDefaultImage(): string {
        // 默认封面 SVG
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTUiIGhlaWdodD0iNTUiIHZpZXdCb3g9IjAgMCA1NSA1NSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjU1IiBoZWlnaHQ9IjU1IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHJ4PSI4Ii8+CjxwYXRoIGQ9Ik0yNy41IDE4TDM1IDI3LjVIMzBWMzdIMjVWMjcuNUgyMEwyNy41IDE4WiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjMpIi8+Cjwvc3ZnPgo=';
    }

    public observe(img: HTMLImageElement): void {
        if (this.observer) {
            this.images.add(img);
            this.observer.observe(img);
        } else {
            // 不支持 IntersectionObserver，直接加载
            this.loadImage(img);
        }
    }

    public observeAll(selector: string = 'img[data-src]'): void {
        const images = document.querySelectorAll<HTMLImageElement>(selector);
        images.forEach(img => this.observe(img));
    }

    public unobserve(img: HTMLImageElement): void {
        if (this.observer) {
            this.observer.unobserve(img);
            this.images.delete(img);
        }
    }

    public destroy(): void {
        if (this.observer) {
            this.observer.disconnect();
            this.images.clear();
        }
    }
}

// 全局懒加载实例
let globalLazyLoader: ImageLazyLoader | null = null;

export function initImageLazyLoad(): ImageLazyLoader {
    if (!globalLazyLoader) {
        globalLazyLoader = new ImageLazyLoader();
    }
    return globalLazyLoader;
}

export function lazyLoadImage(img: HTMLImageElement): void {
    if (!globalLazyLoader) {
        globalLazyLoader = initImageLazyLoad();
    }
    globalLazyLoader.observe(img);
}

export function cleanupImageLazyLoad(): void {
    if (globalLazyLoader) {
        globalLazyLoader.destroy();
        globalLazyLoader = null;
    }
}