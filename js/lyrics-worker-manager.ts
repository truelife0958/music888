/**
 * 歌词 Worker 管理器
 * 管理 Web Worker 的创建、通信和生命周期
 */

import type { LyricLine, ParseLyricMessage, ParseLyricResponse } from './lyrics-worker.js';

interface PendingRequest {
    resolve: (lines: LyricLine[]) => void;
    reject: (error: Error) => void;
}

class LyricsWorkerManager {
    private worker: Worker | null = null;
    private pendingRequests = new Map<string, PendingRequest>();
    private requestId = 0;
    private workerReady = false;

    /**
     * 初始化 Worker
     */
    init(): void {
        if (this.worker) {
            return;
        }

        try {
            // 使用动态导入创建 Worker
            this.worker = new Worker(
                new URL('./lyrics-worker.ts', import.meta.url),
                { type: 'module' }
            );

            this.worker.addEventListener('message', this.handleMessage.bind(this));
            this.worker.addEventListener('error', this.handleError.bind(this));
            
            this.workerReady = true;
            console.log('✅ 歌词 Worker 初始化成功');
        } catch (error) {
            console.error('❌ 歌词 Worker 初始化失败，使用降级方案:', error);
            this.workerReady = false;
            // BUG-003修复: Worker初始化失败时，创建降级Worker接口
            this.createFallbackWorker();
        }
    }

    /**
     * BUG-003修复: 创建降级Worker（模拟Worker接口）
     */
    private createFallbackWorker(): void {
        console.log('📦 创建降级Worker接口');
        
        // 创建一个模拟Worker对象，实现必要的接口
        const mockWorker = {
            postMessage: (message: any) => {
                // 在主线程同步处理
                setTimeout(() => {
                    try {
                        const { type, lyric, id } = message;
                        if (type === 'parse') {
                            const lines = this.parseLyricFallback(lyric);
                            this.handleMessage({
                                data: { id, lines, error: undefined }
                            } as MessageEvent<any>);
                        }
                    } catch (error) {
                        this.handleMessage({
                            data: {
                                id: message.id,
                                lines: [],
                                error: error instanceof Error ? error.message : 'Unknown error'
                            }
                        } as MessageEvent<any>);
                    }
                }, 0);
            },
            addEventListener: (type: string, handler: any) => {
                // 降级模式不需要监听事件，因为我们直接调用handleMessage
            },
            terminate: () => {
                // 降级模式没有实际Worker需要终止
                console.log('🧹 降级Worker已终止');
            }
        };
        
        this.worker = mockWorker as any;
        this.workerReady = true;
        console.log('✅ 降级Worker创建成功');
    }

    /**
     * 处理 Worker 消息
     */
    private handleMessage(event: MessageEvent<ParseLyricResponse>): void {
        const { id, lines, error } = event.data;
        
        const request = this.pendingRequests.get(id);
        if (!request) {
            console.warn('收到未知请求的响应:', id);
            return;
        }

        this.pendingRequests.delete(id);

        if (error) {
            request.reject(new Error(error));
        } else {
            request.resolve(lines);
        }
    }

    /**
     * 处理 Worker 错误
     */
    private handleError(event: ErrorEvent): void {
        console.error('歌词 Worker 错误:', event.message);
        
        // 拒绝所有待处理的请求
        this.pendingRequests.forEach((request) => {
            request.reject(new Error('Worker 处理失败'));
        });
        this.pendingRequests.clear();
    }

    /**
     * 解析歌词（使用 Worker）
     */
    async parseLyric(lyric: string): Promise<LyricLine[]> {
        // 如果 Worker 未就绪，使用降级方案
        if (!this.workerReady || !this.worker) {
            console.warn('Worker 不可用，使用主线程解析');
            return this.parseLyricFallback(lyric);
        }

        // 如果歌词为空，直接返回
        if (!lyric || !lyric.trim()) {
            return [];
        }

        return new Promise((resolve, reject) => {
            const id = `request_${this.requestId++}`;
            
            this.pendingRequests.set(id, { resolve, reject });

            const message: ParseLyricMessage = {
                type: 'parse',
                lyric,
                id
            };

            this.worker!.postMessage(message);

            // 设置超时
            setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    reject(new Error('歌词解析超时'));
                }
            }, 5000);
        });
    }

    /**
     * 降级方案：主线程解析歌词
     */
    private parseLyricFallback(lyric: string): LyricLine[] {
        if (!lyric || !lyric.trim()) {
            return [];
        }

        const lines: LyricLine[] = [];
        const lyricLines = lyric.split('\n');
        const timeRegex = /\[(\d{2,}):(\d{2})(?:\.(\d{2,3}))?\]/g;

        // 老王修复BUG：提取offset偏移量（歌词时间校正）
        let offsetMs = 0;
        const offsetMatch = lyric.match(/\[offset:(-?\d+)\]/i);
        if (offsetMatch) {
            offsetMs = parseInt(offsetMatch[1], 10);
            console.log(`🎵 [歌词偏移] 检测到offset: ${offsetMs}ms`);
        }

        for (const line of lyricLines) {
            const text = line.replace(timeRegex, '').trim();

            if (!text || /^\[(?:ti|ar|al|by|offset):/i.test(line)) {
                continue;
            }

            let match;
            const times: number[] = [];

            while ((match = timeRegex.exec(line)) !== null) {
                const minutes = parseInt(match[1], 10);
                const seconds = parseInt(match[2], 10);
                const milliseconds = match[3] ? parseInt(match[3].padEnd(3, '0'), 10) : 0;
                // 老王修复BUG：应用offset偏移量（转换为秒）
                const totalTime = minutes * 60 + seconds + milliseconds / 1000 + offsetMs / 1000;
                times.push(totalTime);
            }

            times.forEach(time => {
                lines.push({ time, text });
            });
        }

        lines.sort((a, b) => a.time - b.time);
        return lines;
    }

    /**
     * 批量解析歌词
     */
    async parseLyricsBatch(lyrics: string[]): Promise<LyricLine[][]> {
        const promises = lyrics.map(lyric => this.parseLyric(lyric));
        return Promise.all(promises);
    }

    /**
     * 销毁 Worker
     */
    destroy(): void {
        if (this.worker) {
            // 拒绝所有待处理的请求
            this.pendingRequests.forEach((request) => {
                request.reject(new Error('Worker 已销毁'));
            });
            this.pendingRequests.clear();

            this.worker.terminate();
            this.worker = null;
            this.workerReady = false;
            console.log('🧹 歌词 Worker 已销毁');
        }
    }

    /**
     * 检查 Worker 是否就绪
     */
    isReady(): boolean {
        return this.workerReady;
    }

    /**
     * 获取待处理请求数量
     */
    getPendingCount(): number {
        return this.pendingRequests.size;
    }
}

// 创建单例实例
const lyricsWorkerManager = new LyricsWorkerManager();

// 导出实例
export default lyricsWorkerManager;
export { LyricsWorkerManager };
export type { LyricLine };