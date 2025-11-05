// js/download-progress.ts - 下载进度提示功能

import { Song } from './api.js';

interface DownloadTask {
    id: string;
    song: Song;
    progress: number;
    status: 'pending' | 'downloading' | 'completed' | 'failed';
    element: HTMLElement;
}

export class DownloadProgressManager {
    private tasks: Map<string, DownloadTask> = new Map();
    private container: HTMLElement | null = null;
    private isCollapsed: boolean = false; // 折叠状态

    constructor() {
        this.createContainer();
    }

    private createContainer(): void {
        this.container = document.createElement('div');
        this.container.id = 'downloadProgressContainer';
        this.container.className = 'download-progress-container';
        this.container.innerHTML = `
            <div class="download-progress-header">
                <span class="download-progress-title">下载任务</span>
                <button class="download-progress-toggle" title="折叠/展开">
                    <i class="fas fa-chevron-down"></i>
                </button>
            </div>
            <div class="download-progress-tasks"></div>
        `;

        // 绑定折叠/展开按钮
        const toggleBtn = this.container.querySelector('.download-progress-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleCollapse());
        }

        document.body.appendChild(this.container);
    }

    private toggleCollapse(): void {
        if (!this.container) return;

        this.isCollapsed = !this.isCollapsed;

        if (this.isCollapsed) {
            this.container.classList.add('collapsed');
        } else {
            this.container.classList.remove('collapsed');
        }

        // 更新图标
        const toggleIcon = this.container.querySelector('.download-progress-toggle i');
        if (toggleIcon) {
            if (this.isCollapsed) {
                toggleIcon.className = 'fas fa-chevron-up';
            } else {
                toggleIcon.className = 'fas fa-chevron-down';
            }
        }
    }

    public startDownload(song: Song, downloadFn: () => Promise<void>): void {
        const taskId = `${song.source}_${song.id}_${Date.now()}`;

        const taskElement = this.createTaskElement(song, taskId);
        const tasksContainer = this.container?.querySelector('.download-progress-tasks');
        if (tasksContainer) {
            tasksContainer.appendChild(taskElement);
        }

        const task: DownloadTask = {
            id: taskId,
            song,
            progress: 0,
            status: 'downloading',
            element: taskElement
        };

        this.tasks.set(taskId, task);
        this.showContainer();

        // 执行下载
        this.executeDownload(taskId, downloadFn);
    }

    private createTaskElement(song: Song, taskId: string): HTMLElement {
        const element = document.createElement('div');
        element.className = 'download-task';
        element.dataset.taskId = taskId;

        const artist = Array.isArray(song.artist) ? song.artist.join(', ') : song.artist;
        const artistDisplay = artist && artist !== '未知艺术家' ? artist : '未知艺术家';

        element.innerHTML = `
            <div class="download-task-info">
                <div class="download-task-name">${this.escapeHtml(song.name)}</div>
                <div class="download-task-artist">${this.escapeHtml(artistDisplay)}</div>
            </div>
            <div class="download-task-progress">
                <div class="download-progress-bar">
                    <div class="download-progress-fill" style="width: 0%"></div>
                </div>
                <div class="download-progress-text">0%</div>
            </div>
            <button class="download-task-remove" title="移除">
                <i class="fas fa-times"></i>
            </button>
        `;

        // 绑定移除按钮
        const removeBtn = element.querySelector('.download-task-remove');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => this.removeTask(taskId));
        }

        return element;
    }

    private async executeDownload(taskId: string, downloadFn: () => Promise<void>): Promise<void> {
        const task = this.tasks.get(taskId);
        if (!task) return;

        try {
            // 模拟进度更新（实际下载时需要根据真实进度更新）
            const progressInterval = setInterval(() => {
                if (task.progress < 90) {
                    task.progress += Math.random() * 10;
                    this.updateProgress(taskId, task.progress);
                }
            }, 200);

            await downloadFn();

            clearInterval(progressInterval);
            this.updateProgress(taskId, 100);
            task.status = 'completed';
            
            // 3秒后自动移除已完成的任务
            setTimeout(() => this.removeTask(taskId), 3000);

        } catch (error) {
            console.error('下载失败:', error);
            task.status = 'failed';
            this.updateTaskStatus(taskId, 'failed');
            
            // 5秒后自动移除失败的任务
            setTimeout(() => this.removeTask(taskId), 5000);
        }
    }

    private updateProgress(taskId: string, progress: number): void {
        const task = this.tasks.get(taskId);
        if (!task) return;

        task.progress = Math.min(100, progress);

        const progressFill = task.element.querySelector('.download-progress-fill') as HTMLElement;
        const progressText = task.element.querySelector('.download-progress-text') as HTMLElement;

        if (progressFill) {
            progressFill.style.width = `${task.progress}%`;
        }

        if (progressText) {
            progressText.textContent = `${Math.floor(task.progress)}%`;
        }

        if (task.progress >= 100) {
            task.element.classList.add('completed');
        }
    }

    private updateTaskStatus(taskId: string, status: 'failed'): void {
        const task = this.tasks.get(taskId);
        if (!task) return;

        task.element.classList.add(status);
        
        if (status === 'failed') {
            const progressText = task.element.querySelector('.download-progress-text') as HTMLElement;
            if (progressText) {
                progressText.textContent = '失败';
                progressText.style.color = '#f44336';
            }
        }
    }

    private removeTask(taskId: string): void {
        const task = this.tasks.get(taskId);
        if (!task) return;

        task.element.style.opacity = '0';
        setTimeout(() => {
            task.element.remove();
            this.tasks.delete(taskId);

            // 如果没有任务了，隐藏容器
            if (this.tasks.size === 0) {
                this.hideContainer();
            }
        }, 300);
    }

    private showContainer(): void {
        if (this.container) {
            this.container.classList.add('visible');
        }
    }

    private hideContainer(): void {
        if (this.container) {
            this.container.classList.remove('visible');
        }
    }

    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    public destroy(): void {
        this.tasks.clear();
        this.container?.remove();
    }
}

// 全局下载管理器实例
let globalDownloadManager: DownloadProgressManager | null = null;

export function initDownloadProgress(): DownloadProgressManager {
    if (!globalDownloadManager) {
        globalDownloadManager = new DownloadProgressManager();
    }
    return globalDownloadManager;
}

export function startDownloadWithProgress(song: Song, downloadFn: () => Promise<void>): void {
    if (!globalDownloadManager) {
        globalDownloadManager = initDownloadProgress();
    }
    globalDownloadManager.startDownload(song, downloadFn);
}

export function cleanupDownloadProgress(): void {
    if (globalDownloadManager) {
        globalDownloadManager.destroy();
        globalDownloadManager = null;
    }
}