/**
 * QQ音乐 Provider - 基于 Listen1 架构
 * 整合 Listen1 的 QQ 音乐 API 到 Music888
 */

import { Listen1BaseProvider, Listen1Track, Listen1SearchResult, Listen1Playlist, Listen1LoginUser } from './listen1-base-provider.js';

export class Listen1QQProvider extends Listen1BaseProvider {
  constructor() {
    super('qq', 'qq');
  }

  search(url: string) {
    return {
      success: async (fn: (data: Listen1SearchResult) => void) => {
        try {
          const params = new URLSearchParams(url.split('?')[1]);
          const keywords = params.get('keywords') || '';
          const curpage = parseInt(params.get('curpage') || '1');
          const type = parseInt(params.get('type') || '0');

          const searchResult = await this.searchQQ(keywords, curpage, type);
          fn(searchResult);
        } catch (error) {
          console.error('[Listen1QQProvider] 搜索失败:', error);
          fn({ result: [], total: 0, type: 'search' });
        }
      }
    };
  }

  private async searchQQ(keywords: string, curpage: number, type: number): Promise<Listen1SearchResult> {
    const offset = (curpage - 1) * 20;

    // QQ音乐搜索URL
    const searchUrls = {
      0: 'song', // 歌曲
      1: 'singer', // 歌手
      1000: 'album' // 专辑/歌单
    };

    const searchType = searchUrls[type as keyof typeof searchUrls] || 'song';
    const searchUrl = `https://c.y.qq.com/soso/fcgi-bin/client_search_cp?w=${encodeURIComponent(keywords)}&format=json&p=${curpage}&n=20&cr=1&g_tk=5381&inCharset=utf-8&outCharset=utf-8&notice=0&platform=yqq&needNewCode=1&uin=0&remoteplace=txt.yqq.center&t=${searchType}`;

    const response = await fetch(searchUrl);
    const result = await response.json();

    const tracks: Listen1Track[] = [];

    if (type === 1) { // 歌手
      const artists = result.data?.list?.singers || [];
      artists.forEach((artist: any) => {
        tracks.push({
          id: `qqartist_${artist.singerid}`,
          title: artist.singername,
          artist: artist.singername,
          album: '',
          source: 'qq',
          source_url: `https://y.qq.com/n/yqq/singer/${artist.singerid}.html`,
          img_url: this.getQQImageUrl(artist.singer_mid, 'artist'),
          url: '',
          disabled: false,
        });
      });
    } else if (type === 1000) { // 专辑
      const albums = result.data?.list?.albums || [];
      albums.forEach((album: any) => {
        tracks.push({
          id: `qqalbum_${album.albumid}`,
          title: album.albumname,
          artist: album.singername || '未知艺术家',
          album: album.albumname,
          source: 'qq',
          source_url: `https://y.qq.com/n/yqq/album/${album.albumid}.html`,
          img_url: this.getQQImageUrl(album.albummid, 'album'),
          url: '',
          disabled: false,
        });
      });
    } else { // 歌曲
      const songs = result.data?.list?.songs || [];
      songs.forEach((song: any) => {
        const isPlayable = this.isQQPlayable(song);

        tracks.push({
          id: `qqtrack_${song.songmid}`,
          title: song.songname,
          artist: song.singer?.map((s: any) => s.name).join(', ') || '',
          album: song.albumname || '',
          source: 'qq',
          source_url: `https://y.qq.com/n/yqq/song/${song.songmid}.html`,
          img_url: this.getQQImageUrl(song.albummid, 'album'),
          url: '',
          disabled: !isPlayable,
          duration: song.interval || 0,
        });
      });
    }

    return {
      result: tracks,
      total: result.data?.total || tracks.length,
      type: 'search',
    };
  }

  bootstrap_track(
    track: Listen1Track,
    successCallback: (response: { url: string; bitrate: number; platform: string }) => void,
    failCallback: () => void
  ) {
    const trackMid = track.id.replace('qqtrack_', '');

    // 获取QQ音乐播放URL
    this.getQQUrl(trackMid, successCallback, failCallback);
  }

  private async getQQUrl(
    trackMid: string,
    successCallback: (response: { url: string; bitrate: number; platform: string }) => void,
    failCallback: () => void
  ) {
    try {
      // QQ音乐获取播放链接需要多个步骤
      // 1. 获取guid
      const guid = Math.round(Math.random() * 1000000000);

      // 2. 获取vkey
      const vkeyUrl = `https://c.y.qq.com/base/fcgi-bin/fcg_music_express_mobile3.fcg?g_tk=0&format=json&inCharset=utf8&outCharset=utf-8&platform=yqq&cid=205361747&songmid=${trackMid}&filename=C400${trackMid}.m4a&guid=${guid}`;

      const vkeyResponse = await fetch(vkeyUrl);
      const vkeyData = await vkeyResponse.json();

      if (vkeyData.data?.items?.length > 0) {
        const item = vkeyData.data.items[0];
        const vkey = item.vkey;
        const url = `http://dl.stream.qqmusic.qq.com/C400${trackMid}.m4a?guid=${guid}&vkey=${vkey}&uin=0&fromtag=66`;

        successCallback({
          url: url,
          bitrate: 320, // 假设320k
          platform: 'qq',
        });
      } else {
        failCallback();
      }
    } catch (error) {
      console.error('[Listen1QQProvider] 获取播放URL失败:', error);
      failCallback();
    }
  }

  lyric(url: string) {
    return {
      success: async (fn: (data: { lyric: string; tlyric?: string }) => void) => {
        try {
          const params = new URLSearchParams(url.split('?')[1]);
          const trackId = params.get('track_id')?.replace('qqtrack_', '');

          if (!trackId) {
            fn({ lyric: '' });
            return;
          }

          const lyricData = await this.getQQLyric(trackId);
          fn(lyricData);
        } catch (error) {
          console.error('[Listen1QQProvider] 获取歌词失败:', error);
          fn({ lyric: '' });
        }
      }
    };
  }

  private async getQQLyric(trackMid: string): Promise<{ lyric: string; tlyric?: string }> {
    const lyricUrl = `https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?songmid=${trackMid}&format=json`;

    const response = await fetch(lyricUrl);
    const result = await response.json();

    let lyric = '';
    let tlyric = '';

    if (result.lyric) {
      lyric = decodeURIComponent(atob(result.lyric));
    }

    if (result.trans) {
      tlyric = decodeURIComponent(atob(result.trans));
    }

    return {
      lyric,
      tlyric,
    };
  }

  show_playlist(url: string) {
    return {
      success: async (fn: (data: { result: Listen1Playlist[] }) => void) => {
        try {
          const params = new URLSearchParams(url.split('?')[1]);
          const offset = parseInt(params.get('offset') || '0');
          let filterId = params.get('filter_id') || '';

          if (filterId === 'toplist') {
            const playlists = await this.getQQTopList();
            fn({ result: playlists });
            return;
          }

          if (filterId === '') {
            filterId = '10000000';
          }

          const playlists = await this.getQQPlaylists(filterId, offset);
          fn({ result: playlists });
        } catch (error) {
          console.error('[Listen1QQProvider] 获取歌单列表失败:', error);
          fn({ result: [] });
        }
      }
    };
  }

  private async getQQTopList(): Promise<Listen1Playlist[]> {
    const url = 'https://c.y.qq.com/v8/fcg-bin/fcg_myqq_toplist.fcg?g_tk=5381&inCharset=utf-8&outCharset=utf-8&notice=0&format=json&uin=0&needNewCode=1&platform=h5';

    const response = await fetch(url);
    const result = await response.json();

    const playlists: Listen1Playlist[] = [];

    result.data?.topList?.forEach((item: any) => {
      playlists.push({
        id: `qqtoplist_${item.id}`,
        title: item.topTitle,
        cover_img_url: item.picUrl,
        source_url: `https://y.qq.com/n/yqq/toplist/${item.id}.html`,
      });
    });

    return playlists;
  }

  private async getQQPlaylists(filterId: string, offset: number): Promise<Listen1Playlist[]> {
    const url = `https://c.y.qq.com/splcloud/fcgi-bin/fcg_get_diss_by_tag.fcg?picmid=1&rnd=${Math.random()}&g_tk=732560869&loginUin=0&hostUin=0&format=json&inCharset=utf8&outCharset=utf-8&notice=0&platform=yqq.json&needNewCode=0&categoryId=${filterId}&sortId=5&sin=${offset}&ein=${29 + offset}`;

    const response = await fetch(url);
    const result = await response.json();

    const playlists: Listen1Playlist[] = [];

    result.data?.list?.forEach((item: any) => {
      playlists.push({
        id: `qqplaylist_${item.dissid}`,
        title: this.htmlDecode(item.dissname),
        cover_img_url: item.imgurl,
        source_url: `https://y.qq.com/n/ryqq/playlist/${item.dissid}`,
      });
    });

    return playlists;
  }

  get_playlist(url: string) {
    return {
      success: async (fn: (data: Listen1Playlist) => void) => {
        try {
          const params = new URLSearchParams(url.split('?')[1]);
          const listId = params.get('list_id');

          if (!listId) {
            fn({
              id: '',
              title: '',
              cover_img_url: '',
              source_url: '',
              tracks: []
            });
            return;
          }

          const playlist = await this.getQQPlaylistDetail(listId);
          fn(playlist);
        } catch (error) {
          console.error('[Listen1QQProvider] 获取歌单详情失败:', error);
          fn({
            id: '',
            title: '',
            cover_img_url: '',
            source_url: '',
            tracks: []
          });
        }
      }
    };
  }

  private async getQQPlaylistDetail(listId: string): Promise<Listen1Playlist> {
    const dissid = listId.replace('qqplaylist_', '').replace('qqtoplist_', '');

    // 这里应该调用QQ音乐API获取歌单详情
    // 由于QQ音乐API的复杂性，这里返回一个基本的歌单结构
    return {
      id: listId,
      title: 'QQ音乐歌单',
      cover_img_url: '',
      source_url: '',
      tracks: []
    };
  }

  parse_url(url: string) {
    return {
      success: (fn: (data: Listen1Track) => void) => {
        // 实现QQ音乐URL解析
        fn({
          id: '',
          title: '',
          artist: '',
          album: '',
          source: 'qq',
          url: '',
        });
      }
    };
  }

  get_playlist_filters(): any[] {
    return [
      {
        id: '10000000',
        name: '全部',
      },
      {
        id: '10000001',
        name: '华语',
      },
      {
        id: '10000002',
        name: '欧美',
      },
      {
        id: '10000008',
        name: '日语',
      },
      {
        id: '10000012',
        name: '韩语',
      },
      {
        id: '10000027',
        name: '粤语',
      },
      {
        id: '10000003',
        name: '轻音乐',
      },
    ];
  }

  // 工具方法
  private htmlDecode(value: string): string {
    const parser = new DOMParser();
    return parser.parseFromString(value, 'text/html').body.textContent || value;
  }

  private getQQImageUrl(qqimgid: string, img_type: string): string {
    if (!qqimgid) {
      return '';
    }

    let category = '';
    if (img_type === 'artist') {
      category = 'T001R300x300M000';
    }
    if (img_type === 'album') {
      category = 'T002R300x300M000';
    }

    const s = category + qqimgid;
    return `https://y.gtimg.cn/music/photo_new/${s}.jpg`;
  }

  private isQQPlayable(song: any): boolean {
    const switchFlag = song.switch?.toString(2).split('') || [];
    switchFlag.pop();
    switchFlag.reverse();

    const playFlag = switchFlag[0];
    const tryFlag = switchFlag[13];
    return playFlag === '1' || (playFlag === '0' && tryFlag === '1');
  }

  login(url: string) {
    return {
      success: (fn: (data: any) => void) => {
        // 实现QQ音乐登录
        fn({});
      }
    };
  }

  get_user() {
    return {
      success: (fn: (data: Listen1LoginUser) => void) => {
        fn({
          id: '',
          name: '',
          avatar_url: '',
          url: '',
        });
      }
    };
  }

  get_login_url() {
    return 'https://graph.qq.com/oauth2.0/authorize?response_type=code&client_id=100495085&redirect_uri=https://y.qq.com/portal/wap_redirect.html';
  }

  logout() {
    return {
      success: (fn: () => void) => {
        fn();
      }
    };
  }
}

// 导出单例实例
export const listen1QQProvider = new Listen1QQProvider();