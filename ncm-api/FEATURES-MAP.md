
# 🎵 网易云音乐API功能映射表

基于 [NeteaseCloudMusicApi](https://gitlab.com/shaoyouvip/neteasecloudmusicapi) 的300+接口功能映射。

## 📋 目录

- [用户相关](#用户相关)
- [歌曲相关](#歌曲相关)
- [歌单相关](#歌单相关)
- [专辑相关](#专辑相关)
- [歌手相关](#歌手相关)
- [MV/视频相关](#mv视频相关)
- [电台相关](#电台相关)
- [评论相关](#评论相关)
- [云盘相关](#云盘相关)
- [搜索相关](#搜索相关)
- [推荐相关](#推荐相关)

## 🔐 用户相关

### 登录认证

| 功能 | 接口 | 说明 |
|------|------|------|
| 手机登录 | `/login/cellphone` | 手机号+密码登录 |
| 邮箱登录 | `/login` | 邮箱+密码登录 |
| 二维码登录 | `/login/qr/key` + `/login/qr/create` | 扫码登录 |
| 刷新登录 | `/login/refresh` | 刷新登录状态 |
| 退出登录 | `/logout` | 登出 |
| 登录状态 | `/login/status` | 检查登录状态 |

**使用示例**：
```javascript
// 手机登录
fetch('http://localhost:3000/login/cellphone?phone=13800138000&password=xxx')
  .then(res => res.json())
  .then(data => console.log(data));

// 检查登录状态
fetch('http://localhost:3000/login/status')
  .then(res => res.json())
  .then(data => console.log(data));
```

### 用户信息

| 功能 | 接口 | 说明 |
|------|------|------|
| 获取用户详情 | `/user/detail` | uid |
| 获取账号信息 | `/user/account` | 登录后调用 |
| 用户歌单 | `/user/playlist` | uid |
| 用户电台 | `/user/dj` | uid |
| 用户关注列表 | `/user/follows` | uid |
| 用户粉丝列表 | `/user/followeds` | uid |
| 用户动态 | `/user/event` | uid |
| 用户播放记录 | `/user/record` | uid, type |
| 用户等级信息 | `/user/level` | 登录后调用 |
| 用户绑定信息 | `/user/binding` | uid |

### 用户操作

| 功能 | 接口 | 说明 |
|------|------|------|
| 签到 | `/daily_signin` | 每日签到 |
| 关注/取消关注用户 | `/follow` | id, t |
| 更新头像 | `/avatar/upload` | 上传图片 |
| 更新昵称 | `/activate/init/profile` | 初始化昵称 |
| 更换绑定手机 | `/rebind` | 更换手机 |
| 绑定手机 | `/cellphone/existence/check` | 检查手机 |

## 🎵 歌曲相关

### 歌曲信息

| 功能 | 接口 | 说明 |
|------|------|------|
| 歌曲详情 | `/song/detail` | ids |
| 歌曲URL | `/song/url` | id, br |
| 歌曲URL-新版 | `/song/url/v1` | id, level |
| 歌词 | `/lyric` | id |
| 相似音乐 | `/simi/song` | id |
| 歌曲评论 | `/comment/music` | id |
| 音乐是否可用 | `/check/music` | id |
| 歌曲音质详情 | `/song/music/detail` | id |
| 歌曲红心数量 | `/song/red/count` | id |
| 副歌时间 | `/song/chorus` | id |

**Meting API兼容格式**：
```javascript
// 获取歌曲URL
fetch('/api.php?type=url&id=186016&server=netease&br=320')
  .then(res => res.json())
  .then(data => console.log(data.url));

// 获取歌词
fetch('/api.php?type=lyric&id=186016&server=netease')
  .then(res => res.json())
  .then(data => console.log(data.lyric));
```

### 歌曲操作

| 功能 | 接口 | 说明 |
|------|------|------|
| 喜欢音乐 | `/like` | id, like |
| 垃圾桶 | `/fm_trash` | id |
| 收藏到歌单 | `/playlist/tracks` | op, pid, tracks |
| 新歌速递 | `/top/song` | type |
| 听歌打卡 | `/scrobble` | id, time |
| 听歌识曲 | `/audio/match` | 音频文件 |

## 📝 歌单相关

### 歌单查询

| 功能 | 接口 | 说明 |
|------|------|------|
| 歌单详情 | `/playlist/detail` | id |
| 歌单所有歌曲 | `/playlist/track/all` | id |
| 精品歌单 | `/top/playlist/highquality` | cat, limit |
| 歌单分类 | `/playlist/catlist` | 所有分类 |
| 热门歌单 | `/top/playlist` | cat, limit |
| 相关歌单 | `/related/playlist` | id |
| 歌单收藏者 | `/playlist/subscribers` | id |

**使用示例**：
```javascript
// 获取歌单详情
fetch('http://localhost:3000/playlist/detail?id=3778678')
  .then(res => res.json())
  .then(data => console.log(data));

// Meting格式
fetch('/api.php?type=playlist&id=3778678&server=netease')
  .then(res => res.json())
  .then(data => console.log(data));
```

### 歌单操作

| 功能 | 接口 | 说明 |
|------|------|------|
| 新建歌单 | `/playlist/create` | name, privacy |
| 删除歌单 | `/playlist/delete` | id |
| 更新歌单名 | `/playlist/name/update` | id, name |
| 更新歌单描述 | `/playlist/desc/update` | id, desc |
| 更新歌单标签 | `/playlist/tags/update` | id, tags |
| 收藏/取消歌单 | `/playlist/subscribe` | id, t |
| 歌单封面上传 | `/playlist/cover/update` | id, imgFile |
| 调整歌单顺序 | `/playlist/order/update` | ids |
| 调整歌曲顺序 | `/playlist/tracks` | op, pid, tracks |

## 💿 专辑相关

| 功能 | 接口 | 说明 |
|------|------|------|
| 专辑内容 | `/album` | id |
| 专辑动态信息 | `/album/detail/dynamic` | id |
| 数字专辑详情 | `/album/detail` | id |
| 数字专辑销量 | `/album/songsaleboard` | albumType |
| 新碟上架 | `/album/new` | limit, offset |
| 最新专辑 | `/album/newest` | 全部 |
| 收藏/取消专辑 | `/album/sub` | id, t |
| 已收藏专辑 | `/album/sublist` | limit, offset |
| 专辑评论 | `/comment/album` | id |

## 🎤 歌手相关

### 歌手信息

| 功能 | 接口 | 说明 |
|------|------|------|
| 歌手详情 | `/artist/detail` | id |
| 歌手描述 | `/artist/desc` | id |
| 歌手单曲 | `/artists` | id |
| 歌手全部歌曲 | `/artist/songs` | id |
| 歌手专辑 | `/artist/album` | id |
| 歌手MV | `/artist/mv` | id |
| 相似歌手 | `/simi/artist` | id |
| 歌手热门50首 | `/artist/top/song` | id |
| 歌手粉丝 | `/artist/fans` | id |
| 歌手粉丝数量 | `/artist/follow/count` | id |

### 歌手榜单

| 功能 | 接口 | 说明 |
|------|------|------|
| 热门歌手 | `/top/artists` | limit, offset |
| 歌手榜 | `/toplist/artist` | type |
| 歌手分类列表 | `/artist/list` | cat, initial |

## 📺 MV/视频相关

### MV相关

| 功能 | 接口 | 说明 |
|------|------|------|
| MV详情 | `/mv/detail` | mvid |
| MV播放地址 | `/mv/url` | id, r |
| MV点赞转发评论数 | `/mv/detail/info` | mvid |
| 相似MV | `/simi/mv` | mvid |
| MV排行 | `/top/mv` | limit, offset |
| 最新MV | `/mv/first` | limit, offset |
| 推荐MV | `/personalized/mv` | 个性化推荐 |
| 全部MV | `/mv/all` | area, type |
| 网易出品MV | `/mv/exclusive/rcmd` | limit, offset |
| 收藏MV | `/mv/sub` | mvid, t |
| 收藏的MV列表 | `/mv/sublist` | limit, offset |
| MV评论 | `/comment/mv` | id |

### 视频相关

| 功能 | 接口 | 说明 |
|------|------|------|
| 视频详情 | `/video/detail` | id |
| 视频播放地址 | `/video/url` | id |
| 相关视频 | `/related/allvideo` | id |
| 视频标签列表 | `/video/category/list` | 所有标签 |
| 视频分类列表 | `/video/group/list` | 所有分类 |
| 全部视频列表 | `/video/timeline/all` | offset |
| 推荐视频 | `/video/timeline/recommend` | offset |
| 收藏视频 | `/video/sub` | id, t |
| 最近播放视频 | `/recent/video` | 登录后 |
| 视频评论 | `/comment/video` | id |

## 📻 电台相关

### 电台信息

| 功能 | 接口 | 说明 |
|------|------|------|
| 电台详情 | `/dj/detail` | rid |
| 电台节目 | `/dj/program` | rid |
| 电台节目详情 | `/dj/program/detail` | id |
| 用户电台 | `/user/dj` | uid |
| 电台订阅列表 | `/dj/sublist` | 登录后 |
| 电台订阅者列表 | `/dj/subscriber` | id |

### 电台分类

| 功能 | 接口 | 说明 |
|------|------|------|
| 电台分类 | `/dj/catelist` | 所有分类 |
| 推荐电台 | `/dj/recommend` | 个性化推荐 |
| 分类推荐电台 | `/dj/recommend/type` | type |
| 类别热门电台 | `/dj/radio/hot` | cateId |
| 今日优选 | `/dj/today/perfered` | 登录后 |

### 电台榜单

| 功能 | 接口 | 说明 |
|------|------|------|
| 电台节目榜 | `/dj/program/toplist` | limit, offset |
| 24小时节目榜 | `/dj/program/toplist/hours` | limit |
| 24小时主播榜 | `/dj/toplist/hours` | limit |
| 新晋电台榜 | `/dj/toplist/newcomer` | limit, offset |
| 热门电台榜 | `/dj/toplist/popular` | limit, offset |
| 付费精品榜 | `/dj/toplist/pay` | limit |

### 电台操作

| 功能 | 接口 | 说明 |
|------|------|------|
| 订阅电台 | `/dj/sub` | rid, t |
| 电台banner | `/dj/banner` | 轮播图 |

## 💬 评论相关

### 查询评论

| 功能 | 接口 | 说明 |
|------|------|------|
| 歌曲评论 | `/comment/music` | id |
| 专辑评论 | `/comment/album` | id |
| 歌单评论 | `/comment/playlist` | id |
| MV评论 | `/comment/mv` | id |
| 视频评论 | `/comment/video` | id |
| 电台节目评论 | `/comment/dj` | id |
| 热门评论 | `/comment/hot` | id, type |
| 楼层评论 | `/comment/floor` | parentCommentId |
| 新版评论 | `/comment/new` | id, type |

### 评论操作

| 功能 | 接口 | 说明 |
|------|------|------|
| 发送评论 | `/comment` | t=1, type, id, content |
| 删除评论 | `/comment` | t=0, type, id, commentId |
| 回复评论 | `/comment` | t=2, type, id, content, commentId |
| 点赞评论 | `/comment/like` | id, cid, t, type |
| 抱一抱评论 | `/comment/hug` | id, cid, type |

## ☁️ 云盘相关

| 功能 | 接口 | 说明 |
|------|------|------|
| 云盘数据 | `/user/cloud` | limit, offset |
| 云盘详情 | `/user/cloud/detail` | id |
| 云盘上传 | `/cloud` | 上传文件 |
| 云盘删除 | `/user/cloud/del` | id |
| 