/**
 * 虚拟滚动组件 - 优化长列表渲染性能
 * 只渲染可见区域的元素，大幅减少DOM节点数量
 */

export interface VirtualScrollOptions<T> {
    // 容器元素
    container: HTMLElement;
    // 数据列表
    items: T[];
    // 单项高度（像素）
    itemHeight: number;
    // 渲染函数
    renderItem: (item: T, index: number) => string;
    // 缓冲区大小（上下额外渲染的项目数）
    bufferSize?: number;
    // 点击回调
    onItemClick?: (item: T, index: number, event: MouseEvent) => void;
}

export class VirtualScroll<T> {
    private container: HTMLElement;
    private items: T[];
    private itemHeight: number;
    private renderItem: (item: T, index: number) => string;
    private bufferSize: number;
    private onItemClick?: (item: T, index: number, event: MouseEvent) => void;
    
    private scrollContainer!: HTMLElement;
    private contentContainer!: HTMLElement;
    private visibleRange: { start: number; end: number } = { start: 0, end: 0 };
    private scrollTop: number = 0;
    
    // 保存绑定后的函数引用，以便正确移除监听器
    private boundHandleScroll!: () => void;
    private boundHandleClick!: (e: MouseEvent) => void;
    
    constructor(options: VirtualScrollOptions<T>) {
        this.container = options.container;
        this.items = options.items;
        this.itemHeight = options.itemHeight;
        this.renderItem = options.renderItem;
        this.bufferSize = options.bufferSize || 5;
        this.onItemClick = options.onItemClick;
        
        // 提前绑定方法
        this.boundHandleScroll = this.handleScroll.bind(this);
        this.boundHandleClick = this.handleClick.bind(this);
        
        this.init();
    }
    
    private init(): void {
        // 清空容器
        this.container.innerHTML = '';
        
        // 创建滚动容器
        this.scrollContainer = document.createElement('div');
        this.scrollContainer.style.cssText = `
            height: 100%;
            overflow-y: auto;
            overflow-x: hidden;
            position: relative;
        `;
        
        // 创建内容容器（用于撑起滚动高度）
        this.contentContainer = document.createElement('div');
        this.contentContainer.style.cssText = `
            position: relative;
            height: ${this.items.length * this.itemHeight}px;
        `;
        
        this.scrollContainer.appendChild(this.contentContainer);
        this.container.appendChild(this.scrollContainer);
        
        // 绑定滚动事件
        this.scrollContainer.addEventListener('scroll', this.boundHandleScroll);
        
        // 绑定点击事件（事件委托）
        if (this.onItemClick) {
            this.contentContainer.addEventListener('click', this.boundHandleClick);
        }
        
        // 初始渲染
        this.render();
    }
    
    private handleScroll(): void {
        this.scrollTop = this.scrollContainer.scrollTop;
        
        // 使用requestAnimationFrame优化滚动性能
        requestAnimationFrame(() => {
            this.render();
        });
    }
    
    private handleClick(event: MouseEvent): void {
        if (!this.onItemClick) return;
        
        const target = event.target as HTMLElement;
        const itemElement = target.closest('[data-virtual-index]') as HTMLElement;
        
        if (itemElement) {
            const index = parseInt(itemElement.dataset.virtualIndex || '0');
            const item = this.items[index];
            if (item) {
                this.onItemClick(item, index, event);
            }
        }
    }
    
    private calculateVisibleRange(): { start: number; end: number } {
        const containerHeight = this.scrollContainer.clientHeight;
        const start = Math.floor(this.scrollTop / this.itemHeight);
        const visibleCount = Math.ceil(containerHeight / this.itemHeight);
        
        // 添加缓冲区
        const bufferedStart = Math.max(0, start - this.bufferSize);
        const bufferedEnd = Math.min(
            this.items.length,
            start + visibleCount + this.bufferSize
        );
        
        return { start: bufferedStart, end: bufferedEnd };
    }
    
    private render(): void {
        const newRange = this.calculateVisibleRange();
        
        // 如果范围没有变化，不需要重新渲染
        if (
            newRange.start === this.visibleRange.start &&
            newRange.end === this.visibleRange.end
        ) {
            return;
        }
        
        this.visibleRange = newRange;
        
        // 生成可见项的HTML
        const fragment = document.createDocumentFragment();
        const wrapper = document.createElement('div');
        
        for (let i = newRange.start; i < newRange.end; i++) {
            const item = this.items[i];
            const itemElement = document.createElement('div');
            itemElement.style.cssText = `
                position: absolute;
                top: ${i * this.itemHeight}px;
                left: 0;
                right: 0;
                height: ${this.itemHeight}px;
            `;
            itemElement.dataset.virtualIndex = String(i);
            itemElement.innerHTML = this.renderItem(item, i);
            
            wrapper.appendChild(itemElement);
        }
        
        // 一次性更新DOM
        this.contentContainer.innerHTML = '';
        this.contentContainer.appendChild(wrapper);
    }
    
    // 更新数据
    public updateItems(items: T[]): void {
        this.items = items;
        this.contentContainer.style.height = `${items.length * this.itemHeight}px`;
        this.render();
    }
    
    // 滚动到指定索引
    public scrollToIndex(index: number, behavior: ScrollBehavior = 'smooth'): void {
        const targetScroll = index * this.itemHeight;
        this.scrollContainer.scrollTo({
            top: targetScroll,
            behavior
        });
    }
    
    // 销毁
    public destroy(): void {
        // 使用保存的绑定引用来正确移除监听器
        this.scrollContainer.removeEventListener('scroll', this.boundHandleScroll);
        if (this.onItemClick) {
            this.contentContainer.removeEventListener('click', this.boundHandleClick);
        }
        this.container.innerHTML = '';
    }
}