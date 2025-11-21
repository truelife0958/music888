/**
 * 搜索历史管理器
 *
 * 老王实现：管理搜索历史，提升用户体验
 * 功能：
 * - LocalStorage持久化存储
 * - 最多保存20条历史
 * - 去重处理
 * - 点击历史快速搜索
 * - 清空历史
 */

export interface SearchHistoryItem {
  keyword: string;
  timestamp: number;
}

export class SearchHistoryManager {
  private readonly STORAGE_KEY = 'music888_search_history';
  private readonly MAX_HISTORY = 20;
  private history: SearchHistoryItem[] = [];

  constructor() {
    this.loadHistory();
  }

  /**
   * 从LocalStorage加载历史
   */
  private loadHistory(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.history = JSON.parse(stored);
        console.log(`📜 [搜索历史] 加载了 ${this.history.length} 条记录`);
      }
    } catch (error) {
      console.error('📜 [搜索历史] 加载失败:', error);
      this.history = [];
    }
  }

  /**
   * 保存历史到LocalStorage
   */
  private saveHistory(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.history));
    } catch (error) {
      console.error('📜 [搜索历史] 保存失败:', error);
    }
  }

  /**
   * 添加搜索记录
   */
  public add(keyword: string): void {
    if (!keyword || keyword.trim().length === 0) {
      return;
    }

    keyword = keyword.trim();

    // 移除已存在的相同关键词
    this.history = this.history.filter(item => item.keyword !== keyword);

    // 添加到开头
    this.history.unshift({
      keyword,
      timestamp: Date.now(),
    });

    // 限制数量
    if (this.history.length > this.MAX_HISTORY) {
      this.history = this.history.slice(0, this.MAX_HISTORY);
    }

    this.saveHistory();
    console.log(`📜 [搜索历史] 添加: ${keyword}`);
  }

  /**
   * 获取所有历史
   */
  public getAll(): SearchHistoryItem[] {
    return [...this.history];
  }

  /**
   * 获取最近N条历史
   */
  public getRecent(count: number = 10): SearchHistoryItem[] {
    return this.history.slice(0, count);
  }

  /**
   * 删除指定关键词
   */
  public remove(keyword: string): void {
    this.history = this.history.filter(item => item.keyword !== keyword);
    this.saveHistory();
    console.log(`📜 [搜索历史] 删除: ${keyword}`);
  }

  /**
   * 清空所有历史
   */
  public clear(): void {
    this.history = [];
    this.saveHistory();
    console.log('📜 [搜索历史] 已清空');
  }

  /**
   * 搜索建议（模糊匹配）
   */
  public getSuggestions(input: string, limit: number = 5): string[] {
    if (!input || input.trim().length === 0) {
      return this.history.slice(0, limit).map(item => item.keyword);
    }

    input = input.trim().toLowerCase();

    return this.history
      .filter(item => item.keyword.toLowerCase().includes(input))
      .slice(0, limit)
      .map(item => item.keyword);
  }
}

// 导出单例
export const searchHistoryManager = new SearchHistoryManager();
