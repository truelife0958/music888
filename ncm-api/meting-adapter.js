// Meting API 适配层
// 将 NeteaseCloudMusicApi 的接口格式转换为 Meting API 格式
// 这样前端代码完全不用修改！

const api = require('@neteasecloudmusicapienhanced/api');

/**
 * Meting API 适配器
 * 支持的type: search, song, url, pic, lrc, playlist
 * 支持的server: netease
 */
class MetingAdapter {
  /**
   * 搜索歌曲
   */
  async search(params) {
    const { name, count = 30 } = params;

    try {
      const result = await api.cloudsearch({
        keywords: name,
        limit: count,
        type: 1 // 1: 单曲
      });

      if (!result.body || !result.body.result || !result.body.result.songs) {
        return [];
      }

      // 转换为Meting格式
      return result.body.result.songs.map(song => ({
        id: String(song.id),
        name: song.name,
        artist: song.ar ? song.ar.map(a => a.name) : ['未知艺术家'],
        album: song.al ? song.al.name : '未知专辑',
        pic_id: song.al && song.al.pic_str ? song.al.pic_str : (song.al && song.al.picUrl ? song.al.picUrl.split('/').pop().split('.')[0] : ''),
        lyric_id: String(song.id),
        url_id: String(song.id),
        source: 'netease'
      }));
    } catch (error) {
      console.error('Search Error:', error);
      return [];
    }
  }

  /**
   * 获取歌曲URL
   */
  async url(params) {
    const { id, br = 320000 } = params;

    try {
      console.log(`🎵 [Meting Adapter] 获取歌曲URL: ID=${id}, BR=${br}`);
      
      const result = await api.song_url_v1({
        id,
        level: this._getBrLevel(br)
      });

      console.log(`📊 [Meting Adapter] API响应:`, JSON.stringify(result.body, null, 2));

      if (!result.body || !result.body.data || result.body.data.length === 0) {
        console.warn(`⚠️ [Meting Adapter] 歌曲 ${id} 无数据返回`);
        return { url: '', br: '' };
      }

      const song = result.body.data[0];
      
      if (!song.url) {
        console.warn(`⚠️ [Meting Adapter] 歌曲 ${id} URL为空，可能是版权限制`);
      } else {
        console.log(`✅ [Meting Adapter] 成功获取URL: ${song.url.substring(0, 50)}...`);
      }
      
      return {
        url: song.url || '',
        br: song.br ? String(Math.floor(song.br / 1000)) : String(br / 1000)
      };
    } catch (error) {
      console.error('❌ [Meting Adapter] URL获取失败:', error);
      return { url: '', br: '' };
    }
  }

  /**
   * 获取歌曲封面
   */
  async pic(params) {
    const { id, size = 300 } = params;

    try {
      const result = await api.song_detail({
        ids: id
      });

      if (!result.body || !result.body.songs || result.body.songs.length === 0) {
        return { url: '' };
      }

      const song = result.body.songs[0];
      let picUrl = song.al && song.al.picUrl ? song.al.picUrl : '';

      // 添加尺寸参数
      if (picUrl && size) {
        picUrl = picUrl.includes('?')
          ? `${picUrl}&param=${size}y${size}`
          : `${picUrl}?param=${size}y${size}`;
      }

      return { url: picUrl };
    } catch (error) {
      console.error('Pic Error:', error);
      return { url: '' };
    }
  }

  /**
   * 获取歌词
   */
  async lyric(params) {
    const { id } = params;

    try {
      const result = await api.lyric({
        id
      });

      if (!result.body) {
        return { lyric: '' };
      }

      // 合并lrc和tlyric（翻译歌词）
      let lyricText = result.body.lrc && result.body.lrc.lyric ? result.body.lrc.lyric : '';

      return { lyric: lyricText };
    } catch (error) {
      console.error('Lyric Error:', error);
      return { lyric: '' };
    }
  }

  /**
   * 获取歌单
   */
  async playlist(params) {
    const { id } = params;

    try {
      const result = await api.playlist_detail({
        id
      });

      if (!result.body || !result.body.playlist || !result.body.playlist.tracks) {
        return [];
      }

      const playlist = result.body.playlist;

      // 转换为Meting格式
      return playlist.tracks.map(song => ({
        id: String(song.id),
        name: song.name,
        artist: song.ar ? song.ar.map(a => a.name) : ['未知艺术家'],
        album: song.al ? song.al.name : '未知专辑',
        pic_id: song.al && song.al.pic_str ? song.al.pic_str : (song.al && song.al.picUrl ? song.al.picUrl.split('/').pop().split('.')[0] : ''),
        lyric_id: String(song.id),
        url_id: String(song.id),
        source: 'netease'
      }));
    } catch (error) {
      console.error('Playlist Error:', error);
      return [];
    }
  }

  /**
   * 获取单曲详情（Meting格式）
   */
  async song(params) {
    const { id } = params;

    try {
      const result = await api.song_detail({
        ids: id
      });

      if (!result.body || !result.body.songs || result.body.songs.length === 0) {
        return [];
      }

      // 转换为Meting格式
      return result.body.songs.map(song => ({
        id: String(song.id),
        name: song.name,
        artist: song.ar ? song.ar.map(a => a.name) : ['未知艺术家'],
        album: song.al ? song.al.name : '未知专辑',
        pic_id: song.al && song.al.pic_str ? song.al.pic_str : (song.al && song.al.picUrl ? song.al.picUrl.split('/').pop().split('.')[0] : ''),
        lyric_id: String(song.id),
        url_id: String(song.id),
        source: 'netease'
      }));
    } catch (error) {
      console.error('Song Error:', error);
      return [];
    }
  }

  /**
   * 将品质参数转换为等级
   */
  _getBrLevel(br) {
    const brNum = parseInt(br);
    if (brNum >= 999000) return 'hires'; // Hi-Res
    if (brNum >= 320000) return 'higher'; // 320K
    if (brNum >= 192000) return 'standard'; // 192K
    return 'standard';
  }
}

module.exports = new MetingAdapter();
