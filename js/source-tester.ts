/**
 * 音源测试脚本
 * 验证多平台音乐源的可用性
 */

import { enhancedSearch } from './enhanced-search.js';
import { unifiedProviderManager } from './providers/unified-provider-manager.js';

export class SourceTester {
  private testResults: {
    system: string;
    platform: string;
    searchTest: boolean;
    playUrlTest: boolean;
    lyricTest: boolean;
    error?: string;
  }[] = [];

  async runFullTest(): Promise<void> {
    console.log('🧪 开始运行音源测试...');
    this.testResults = [];

    // 测试关键词
    const testKeyword = '周杰伦';
    const testPlatforms = ['netease', 'qq'];

    for (const platform of testPlatforms) {
      console.log(`🎵 测试平台: ${platform}`);

      // 测试搜索功能
      const searchResult = await this.testSearch(testKeyword, platform);

      if (searchResult.songs.length > 0) {
        const testSong = searchResult.songs[0];

        // 测试播放URL
        const playUrlResult = await this.testPlayUrl(testSong);

        // 测试歌词
        const lyricResult = await this.testLyric(testSong);

        this.testResults.push({
          system: searchResult.fromSource || 'unknown',
          platform,
          searchTest: true,
          playUrlTest: playUrlResult.success,
          lyricTest: lyricResult.success,
          error: playUrlResult.error || lyricResult.error
        });
      } else {
        this.testResults.push({
          system: 'unknown',
          platform,
          searchTest: false,
          playUrlTest: false,
          lyricTest: false,
          error: '搜索无结果'
        });
      }

      // 避免请求过快
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    this.printTestResults();
  }

  private async testSearch(keyword: string, platform: string): Promise<{ songs: any[]; fromSource?: string }> {
    try {
      const result = await enhancedSearch.search({
        keyword,
        source: platform,
        type: 0,
        limit: 5
      });
      return result;
    } catch (error) {
      console.error(`搜索测试失败 (${platform}):`, error);
      return { songs: [] };
    }
  }

  private async testPlayUrl(song: any): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await enhancedSearch.getPlayUrl(song);
      return { success: !!result.url };
    } catch (error) {
      console.error('播放URL测试失败:', error);
      return { success: false, error: String(error) };
    }
  }

  private async testLyric(song: any): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await enhancedSearch.getLyric(song);
      return { success: !!result.lyric };
    } catch (error) {
      console.error('歌词测试失败:', error);
      return { success: false, error: String(error) };
    }
  }

  private printTestResults(): void {
    console.log('\n📊 测试结果汇总:');
    console.table(this.testResults);

    const successCount = this.testResults.filter(r =>
      r.searchTest && r.playUrlTest && r.lyricTest
    ).length;

    const totalCount = this.testResults.length;

    console.log(`\n✅ 成功: ${successCount}/${totalCount}`);
    console.log(`❌ 失败: ${totalCount - successCount}/${totalCount}`);

    if (successCount < totalCount) {
      console.log('\n⚠️ 部分测试失败的详细信息:');
      this.testResults
        .filter(r => !(r.searchTest && r.playUrlTest && r.lyricTest))
        .forEach(r => {
          console.log(`- ${r.platform}: ${r.error || '部分功能不可用'}`);
        });
    }
  }

  async testSystemStatus(): Promise<void> {
    console.log('🔍 检查系统状态...');

    const status = unifiedProviderManager.getSystemStatus();
    const platforms = unifiedProviderManager.getAllPlatforms();
    const searchStats = enhancedSearch.getSearchStats();

    console.log('🎛️ 系统状态:', status);
    console.log('🌐 支持平台数量:', platforms.length);
    console.log('📈 搜索统计:', searchStats);
  }
}

// 导出单例实例
export const sourceTester = new SourceTester();

// 在浏览器控制台可以直接运行测试
if (typeof window !== 'undefined') {
  (window as any).sourceTester = sourceTester;
  console.log('💡 可以在控制台运行 sourceTester.runFullTest() 来测试音源');
}