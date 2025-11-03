# 🎵 沄听音乐播放器 - 音乐源API配置说明

**项目**: music888  
**更新时间**: 2025-11-03  
**作者**: truelife0958  

---

## 📋 当前使用的音乐API源

根据项目代码分析，本项目配置了以下音乐API源：

### 1. 主要API源

#### 🔵 GDStudio 音乐API（主要）
- **API地址**: `https://music-api.gdstudio.xyz/api.php`
- **类型**: 标准格式 (standard)
- **状态**: ✅ 活跃
- **配置位置**: [`js/api.ts:56-59`](js/api.ts:56-59)
- **支持平台**: 
  - 网易云音乐 (netease)
  - QQ音乐 (tencent)
  - 酷狗音乐 (kugou)
  - 酷我音乐 (kuwo)
  - 虾米音乐 (xiami)
  - 百度音乐 (baidu)
- **请求格式**: 
```
https://music-api.gdstudio.xyz/api.php?types=search&source=netease&name=关键词&count=30
```

#### 🟢 自建Vercel API（备用）
- **API地址**: `https://music888-4swa.vercel.app/api.php`
- **类型**: 标准格式 (standard)
- **状态**: ⚠️ 需要验证
- **配置位置**: [`js/api.ts:60-64`](js/api.ts:60-64)
- **说明**: 这是项目自建的备用API，使用相同的Meting格式

#### 🔴 本地Meting API（开发环境）
- **API地址**: `/api/meting`
- **类型**: Meting格式
- **状态**: ❌ 仅开发环境可用
- **配置位置**: [`js/api.ts:66-69`](js/api.ts:66-69)
- **说明**: 
  - 通过Vite代理到本地API服务器
  - 生产环境不可用，已被注释为"开发"

---

## 🔧 API格式说明

### 标准格式 (Standard Format)
```javascript
// 搜索歌曲
GET /api.php?types=search&source=netease&name=周杰伦&count=30

// 获取歌曲URL
GET /api.php?types=url&source=netease&id=歌曲ID&br=320

// 获取歌词
GET /api.php?types=lyric&source=netease&id=歌曲ID

// 获取封面
GET /api.php?types=pic&source=netease&id=图片ID&size=300

// 获取歌单
GET /api.php?types=playlist&source=netease&id=歌单ID
```

### Meting格式 (兼容格式)
```javascript
// 搜索歌曲
GET /api.php?server=netease&type=search&name=周杰伦&count=30

// 获取歌曲URL
GET /api.php?server=netease&type=url&id=歌曲ID&br=320

// 获取歌词
GET /api.php?server=netease&type=lyric&id=歌曲ID

// 获取封面
GET /api.php?server=netease&type=pic&id=图片ID

// 获取歌单
GET /api.php?server=netease&type=playlist&id=歌单ID
```

**参数映射关系**:
- `server` ↔ `source` (音乐平台)
- `type` ↔ `types` (操作类型)

---

## 🎯 特殊音乐源配置

### Bilibili音乐源
- **独立API**: `https://api.cenguigui.cn/api/bilibili/bilibili.php`
- **类型**: 第三方API (笒鬼鬼)
- **配置位置**: [`js/api.ts:444`](js/api.ts:444)
- **支持操作**:
  - 搜索: `?action=search&query=关键词&page=1&limit=30`
  - 获取媒体: `?action=media&bvid=BV号&quality=high`
  - 榜单: `?action=chart&type=hot&limit=100`

---

## 🔄 API故障转移机制

### 自动切换逻辑
1. **失败计数**: 连续失败3次后触发切换 ([`js/api.ts:81`](js/api.ts:81))
2. **最大切换次数**: 防止无限循环，最多切换10次 ([`js/api.ts:83`](js/api.ts:83))
3. **重试机制**: 每个请求最多重试2次，超时5秒 ([`js/api.ts:241-244`](js/api.ts:241-244))

### API优先级
```
1. GDStudio 音乐API (主要)
   ↓ 失败3次
2. 自建Vercel API (备用)
   ↓ 失败3次
3. 本地Meting API (开发)
   ↓ 全部失败
4. 网易云直链降级 (仅网易云音乐)
```

---

## 🎼 支持的音乐平台

| 平台ID | 平台名称 | 优先级 | 状态 | 配置位置 |
|--------|----------|--------|------|----------|
| `netease` | 网易云音乐 | 1 | ✅ 可用 | [`js/api.ts:434`](js/api.ts:434) |
| `tencent` | QQ音乐 | 2 | ✅ 可用 | [`js/api.ts:435`](js/api.ts:435) |
| `kugou` | 酷狗音乐 | 3 | ⚠️ 部分可用 | [`js/api.ts:436`](js/api.ts:436) |
| `kuwo` | 酷我音乐 | 4 | ⚠️ 部分可用 | [`js/api.ts:437`](js/api.ts:437) |
| `xiami` | 虾米音乐 | 5 | ❌ 已关闭 | [`js/api.ts:438`](js/api.ts:438) |
| `baidu` | 百度音乐 | 6 | ❌ 不稳定 | [`js/api.ts:439`](js/api.ts:439) |
| `bilibili` | Bilibili音乐 | 7 | ✅ 可用 | [`js/api.ts:440`](js/api.ts:440) |

**注意**: 
- 前端UI只显示网易云和QQ音乐 ([`index.html:36-39`](index.html:36-39))
- 其他平台代码存在但未在UI暴露
- 建议删除已关闭平台的代码

---

## 📊 API监控与统计

### 音乐源成功率统计
项目实现了音乐源成功率追踪机制 ([`js/api.ts:447-469`](js/api.ts:447-469))：

```typescript
// 记录每个音乐源的成功/失败次数
const sourceStats = new Map<string, { success: number; total: number }>();

// 根据成功率动态调整音乐源优先级
function getSortedSources(currentSource: string): string[]
```

### API状态显示
- **UI元素**: `#apiStatus` ([`js/api.ts:226`](js/api.ts:226))
- **更新时机**: 初始化时 (需要改进：API切换时也应更新)
- **显示信息**: 
  - 当前API名称
  - API索引 (x/总数)
  - 失败次数
  - 切换次数

---

## 🚨 已知问题与限制

### 1. API配置不一致
- **问题**: [`api/meting.js`](api/meting.js:34) 硬编码使用 GDStudio API
- **影响**: 缺少故障转移机制
- **优先级**: P0 (严重)

### 2. 搜索频率限制
- **配置**: 10秒内最多20次搜索 ([`js/api.ts:88`](js/api.ts:88))
- **触发**: 抛出 `SEARCH_RATE_LIMIT_EXCEEDED` 错误
- **清理**: 每60秒清理过期记录

### 3. 第三方API依赖
- **Bilibili**: 依赖 `api.cenguigui.cn`
- **风险**: 第三方服务可靠性无法保证
- **建议**: 添加降级方案

### 4. 网易云直链降级
- **URL**: `https://music.163.com/song/media/outer/url?id={id}.mp3`
- **触发条件**: 
  - API返回401未授权
  - API返回空URL
  - API请求失败
- **限制**: 仅支持网易云音乐源
- **配置位置**: [`js/api.ts:643-730`](js/api.ts:643-730)

---

## 💡 优化建议

### 1. 统一API配置
将所有API配置集中管理，避免硬编码：
```typescript
// 建议创建 api-config.ts
export const API_ENDPOINTS = {
    primary: 'https://music-api.gdstudio.xyz/api.php',
    fallback: 'https://music888-4swa.vercel.app/api.php',
    bilibili: 'https://api.cenguigui.cn/api/bilibili/bilibili.php'
};
```

### 2. 添加API健康检查
```typescript
// 定期检查API可用性
export async function checkSourcesHealth()
```
已实现但未在UI中展示 ([`js/api.ts:1417-1453`](js/api.ts:1417-1453))

### 3. 实现请求缓存
```typescript
// 缓存搜索结果，减少重复请求
const searchCache = new Map<string, { data: Song[], timestamp: number }>();
```

### 4. 添加API密钥保护
```typescript
// 防止API被滥用
headers: {
    'X-API-Key': process.env.VITE_API_KEY
}
```

---

## 📚 相关文档

- [Meting API文档](https://github.com/metowolf/Meting)
- [网易云音乐API](https://binaryify.github.io/NeteaseCloudMusicApi/)
- [项目部署指南](VERCEL-DEPLOY-GUIDE.md)
- [快速开始指南](QUICK_START_GUIDE.md)

---

## 🔗 重要代码位置

| 功能 | 文件路径 | 行号 |
|------|----------|------|
| API源配置 | `js/api.ts` | 54-70 |
| API切换逻辑 | `js/api.ts` | 156-202 |
| 搜索限流 | `js/api.ts` | 785-827 |
| 故障转移 | `js/api.ts` | 186-191 |
| Bilibili API | `js/api.ts` | 927-985 |
| Meting适配器 | `api/meting.js` | 全文 |
| 音乐源统计 | `js/api.ts` | 406-430 |

---

## ✅ 最佳实践

1. **始终使用重试机制**: 所有API请求都应通过 `fetchWithRetry()` 
2. **记录失败原因**: 使用 `handleApiFailure()` 触发自动切换
3. **成功后重置计数**: 调用 `resetApiFailureCount()` 
4. **检查限流错误**: 捕获 `SEARCH_RATE_LIMIT_EXCEEDED` 特殊错误
5. **验证响应格式**: 使用 `parseApiResponse()` 统一解析

---

**总结**: 本项目采用多API源 + 自动故障转移 + 智能限流的架构，确保音乐服务的稳定性和可用性。主要使用GDStudio音乐API作为主要源，配合自建Vercel API作为备份，并为Bilibili音乐源提供独立API支持。