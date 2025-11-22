/**
 * 老王实现：歌词时间轴调节器
 * 功能：调节歌词时间偏移，保持歌词与歌曲播放同步
 */

export interface LyricOffset {
  songId: string;
  offset: number; // 秒，正数=延后，负数=提前
}

const STORAGE_KEY = 'lyric_offsets';
const OFFSET_STEP = 0.5; // 每次调节0.5秒
const MAX_OFFSET = 10; // 最大偏移±10秒
const MIN_OFFSET = -10;

/**
 * 歌词偏移量管理类 - 单例模式
 */
class LyricAdjusterManager {
  private static instance: LyricAdjusterManager;
  private offsets: Map<string, number> = new Map();
  private currentSongId: string = '';
  private currentOffset: number = 0;

  private constructor() {
    this.loadOffsetsFromStorage();
  }

  static getInstance(): LyricAdjusterManager {
    if (!LyricAdjusterManager.instance) {
      LyricAdjusterManager.instance = new LyricAdjusterManager();
    }
    return LyricAdjusterManager.instance;
  }

  /**
   * 设置当前歌曲ID
   */
  setCurrentSong(songId: string): void {
    this.currentSongId = songId;
    // 从存储中加载该歌曲的偏移量
    this.currentOffset = this.offsets.get(songId) || 0;
    console.log(`[LyricAdjuster] 切换歌曲: ${songId}, 偏移量: ${this.currentOffset}s`);
    this.updateDisplay();
  }

  /**
   * 获取当前偏移量
   */
  getCurrentOffset(): number {
    return this.currentOffset;
  }

  /**
   * 增加偏移量（歌词延后）
   */
  increaseOffset(): void {
    if (this.currentOffset >= MAX_OFFSET) {
      console.warn('[LyricAdjuster] 已达到最大偏移量');
      return;
    }
    this.currentOffset += OFFSET_STEP;
    this.saveCurrentOffset();
    this.updateDisplay();
    console.log(`[LyricAdjuster] 歌词延后: ${this.currentOffset}s`);
  }

  /**
   * 减少偏移量（歌词提前）
   */
  decreaseOffset(): void {
    if (this.currentOffset <= MIN_OFFSET) {
      console.warn('[LyricAdjuster] 已达到最小偏移量');
      return;
    }
    this.currentOffset -= OFFSET_STEP;
    this.saveCurrentOffset();
    this.updateDisplay();
    console.log(`[LyricAdjuster] 歌词提前: ${this.currentOffset}s`);
  }

  /**
   * 重置偏移量
   */
  resetOffset(): void {
    this.currentOffset = 0;
    this.saveCurrentOffset();
    this.updateDisplay();
    console.log(`[LyricAdjuster] 歌词偏移量已重置`);
  }

  /**
   * 保存当前偏移量
   */
  private saveCurrentOffset(): void {
    if (!this.currentSongId) return;

    if (this.currentOffset === 0) {
      // 如果偏移量为0，删除记录以节省空间
      this.offsets.delete(this.currentSongId);
    } else {
      this.offsets.set(this.currentSongId, this.currentOffset);
    }

    this.saveOffsetsToStorage();
  }

  /**
   * 从localStorage加载偏移量
   */
  private loadOffsetsFromStorage(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved) as LyricOffset[];
        data.forEach((item) => {
          this.offsets.set(item.songId, item.offset);
        });
        console.log(`[LyricAdjuster] 已加载 ${this.offsets.size} 个歌词偏移记录`);
      }
    } catch (error) {
      console.error('[LyricAdjuster] 加载偏移量失败:', error);
      this.offsets.clear();
    }
  }

  /**
   * 保存偏移量到localStorage
   */
  private saveOffsetsToStorage(): void {
    try {
      const data: LyricOffset[] = [];
      this.offsets.forEach((offset, songId) => {
        data.push({ songId, offset });
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('[LyricAdjuster] 保存偏移量失败:', error);
    }
  }

  /**
   * 更新UI显示
   */
  private updateDisplay(): void {
    const displayElement = document.getElementById('lyricOffsetDisplay');
    if (displayElement) {
      const sign = this.currentOffset >= 0 ? '+' : '';
      displayElement.textContent = `${sign}${this.currentOffset.toFixed(1)}s`;

      // 老王美化：根据偏移量改变颜色
      if (this.currentOffset === 0) {
        displayElement.style.color = 'rgba(255, 255, 255, 0.7)';
      } else {
        displayElement.style.color = '#ff6b6b'; // 高亮显示有偏移
      }
    }
  }

  /**
   * 清除所有偏移量
   */
  clearAllOffsets(): void {
    this.offsets.clear();
    this.currentOffset = 0;
    this.saveOffsetsToStorage();
    this.updateDisplay();
    console.log('[LyricAdjuster] 已清除所有歌词偏移记录');
  }

  /**
   * 获取偏移量统计信息
   */
  getStats(): { totalRecords: number; currentOffset: number } {
    return {
      totalRecords: this.offsets.size,
      currentOffset: this.currentOffset,
    };
  }
}

// 导出单例实例
export const lyricAdjuster = LyricAdjusterManager.getInstance();

/**
 * 初始化歌词调节器UI
 */
export function initLyricAdjuster(): void {
  const decreaseBtn = document.getElementById('lyricAdjustDecrease');
  const increaseBtn = document.getElementById('lyricAdjustIncrease');
  const resetBtn = document.getElementById('lyricAdjustReset');

  if (decreaseBtn) {
    decreaseBtn.addEventListener('click', () => {
      lyricAdjuster.decreaseOffset();
    });
  }

  if (increaseBtn) {
    increaseBtn.addEventListener('click', () => {
      lyricAdjuster.increaseOffset();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      lyricAdjuster.resetOffset();
    });
  }

  console.log('✅ [LyricAdjuster] 歌词调节器初始化完成');
}

// 导出便捷方法
export const getLyricOffset = () => lyricAdjuster.getCurrentOffset();
export const setCurrentSong = (songId: string) => lyricAdjuster.setCurrentSong(songId);
export const adjustLyricForward = () => lyricAdjuster.decreaseOffset();
export const adjustLyricBackward = () => lyricAdjuster.increaseOffset();
export const resetLyricOffset = () => lyricAdjuster.resetOffset();

export default lyricAdjuster;
