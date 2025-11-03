# 🔥 搜索无限循环BUG深度分析报告

**报告时间**: 2025-11-03 21:45  
**BUG编号**: BUG-002-RECURRENCE  
**严重程度**: 🔥 致命（Critical）

---

## 📊 问题复现确认

### 生产环境日志分析

用户在搜索关键词 `"BE氛围「宿命感」虐文/小说灵感"` 时：

1. **循环次数**: 20+ 次搜索请求
2. **每次结果**: 返回0首歌曲
3. **API切换**: 在 `/api/meting` 和 `https://api.i-meto.com/meting/api` 之间反复切换
4. **所有音乐源**: tencent, kugou, kuwo, xiami, baidu, bilibili 全部尝试
5. **总耗时**: 超过30秒
6. **用户体验**: 页面卡死，无任何提示

### 关键日志片段

```
🔍 [searchMusicAPI] 搜索请求: {关键词: 'BE氛围「宿命感」虐文/小说灵感', 音乐源: 'tencent', 尝试次数: '1/20'}
✅ [searchMusicAPI] 搜索成功: {返回歌曲数: 0}
🔍 [searchMusicAPI] 搜索请求: {关键词: 'BE氛围「宿命感」虐文/小说灵感', 音乐源: 'kugou', 尝试次数: '1/20'}
✅ [searchMusicAPI] 搜索成功: {返回歌曲数: 0}
[重复20+次...]
```

**关键发现**: `尝试次数` 始终显示为 `1/20`，说明计数器被反复重置！

---

## 🐛 根本原因分析

### 1. 修复存在但无效

**已实施的修复**（第85-88行，783-802行，892-895行）:
```typescript
// 全局变量
let searchAttemptCount = 0;
const MAX_SEARCH_ATTEMPTS = 20;
let lastSearchKeyword = '';

// 检测新搜索
if (keyword !== lastSearchKeyword) {
    searchAttemptCount = 0; // 重置
    lastSearchKeyword = keyword;
}

// 递增并检查
searchAttemptCount++;
if (searchAttemptCount > MAX_SEARCH_ATTEMPTS) {
    return []; // 停止搜索
}
```

### 2. 致命缺陷1：多层调用导致关键词重置失效

**调用链**:
```
用户点击搜索
  ↓
搜索处理函数（js/main.ts 或 js/ui.ts）
  ↓
searchMusic() 包装函数
  ↓
【循环】尝试不同音乐源
  ↓
  searchMusicAPI(keyword, 'tencent')
  searchMusicAPI(keyword, 'kugou')  ← 关键词相同！
  searchMusicAPI(keyword, 'kuwo')   ← 每次调用都被视为"同一搜索"
```

**问题**: 第785-789行的逻辑判断 `keyword !== lastSearchKeyword` 永远为 `false`，因为关键词始终相同！

### 3. 致命缺陷2：搜索成功但返回0结果时重置计数器

**第892-895行**:
```typescript
// 搜索成功后重置计数器
if (songs.length > 0) {
    searchAttemptCount = 0;
    lastSearchKeyword = '';
}
```

**问题**: 只有当 `songs.length > 0` 时才重置，但实际情况是：
- API返回成功（200状态码）
- 但结果数组为空（0首歌曲）
- 不满足重置条件
- **但外层代码会切换到下一个音乐源继续尝试**
- 下一次调用时，关键词相同，计数器不重置
- **继续累加计数**

### 4. 致命缺陷3：外层调用者未捕获停止信号

当 `searchAttemptCount > MAX_SEARCH_ATTEMPTS` 时返回空数组 `[]`，但外层调用者（如 `searchMusic()` 函数）会将空数组视为"搜索失败"，继续尝试下一个音乐源。

---

## 💡 完整解决方案

### 方案A：基于音乐源的计数器（推荐）

**核心思路**: 不按关键词计数，而是按"关键词+音乐源组合"计数

```typescript
// 全局变量修改
const searchAttempts = new Map<string, number>(); // key: "keyword|source"
const MAX_SEARCH_ATTEMPTS_PER_SOURCE = 3; // 每个音乐源最多3次
const MAX_TOTAL_SEARCH_ATTEMPTS = 20; // 总共最多20次

// 在 searchMusicAPI() 中
const attemptKey = `${keyword}|${source}`;
const currentAttempt = (searchAttempts.get(attemptKey) || 0) + 1;
searchAttempts.set(attemptKey, currentAttempt);

// 检查单个音乐源的尝试次数
if (currentAttempt > MAX_SEARCH_ATTEMPTS_PER_SOURCE) {
    console.warn(`⚠️ 音乐源 ${source} 已达到最大尝试次数`);
    throw new Error('SEARCH_SOURCE_LIMIT_EXCEEDED');
}

// 检查总尝试次数
const totalAttempts = Array.from(searchAttempts.values()).reduce((a, b) => a + b, 0);
if (totalAttempts > MAX_TOTAL_SEARCH_ATTEMPTS) {
    console.error('❌ 已达到总搜索尝试次数限制');
    searchAttempts.clear(); // 清空记录
    throw new Error('SEARCH_TOTAL_LIMIT_EXCEEDED');
}
```

### 方案B：基于时间窗口的限流（最简单）

**核心思路**: 同一关键词在短时间内（如10秒）最多搜索20次

```typescript
// 全局变量
const searchTimestamps = new Map<string, number[]>(); // key: keyword, value: [timestamp1, timestamp2, ...]
const SEARCH_WINDOW_MS = 10000; // 10秒时间窗口
const MAX_SEARCHES_IN_WINDOW = 20;

// 在 searchMusicAPI() 开头
const now = Date.now();
const timestamps = searchTimestamps.get(keyword) || [];
// 过滤掉10秒前的记录
const recentTimestamps = timestamps.filter(t => now - t < SEARCH_WINDOW_MS);
recentTimestamps.push(now);
searchTimestamps.set(keyword, recentTimestamps);

// 检查是否超限
if (recentTimestamps.length > MAX_SEARCHES_IN_WINDOW) {
    console.error('❌ 搜索频率过高，请稍后再试');
    throw new Error('SEARCH_RATE_LIMIT_EXCEEDED');
}
```

### 方案C：外层调用者捕获特殊错误（最彻底）

在外层搜索函数中：

```typescript
async function searchMusic(keyword: string) {
    const sources = ['netease', 'tencent', 'kugou', 'kuwo'];
    
    for (const source of sources) {
        try {
            const results = await searchMusicAPI(keyword, source);
            if (results.length > 0) {
                return results;
            }
        } catch (error) {
            // 捕获特殊错误，停止所有尝试
            if (error.message.includes('SEARCH_LIMIT_EXCEEDED')) {
                console.error('停止搜索：已达到限制');
                return [];
            }
            // 其他错误继续尝试下一个音乐源
            continue;
        }
    }
    
    return [];
}
```

---

## 🎯 推荐实施方案

**组合方案：B + C**

1. **方案B（时间窗口限流）**: 简单高效，适合快速修复
2. **方案C（错误传播）**: 确保外层调用者停止循环

### 优势

- ✅ 简单直接，代码改动最小
- ✅ 不依赖关键词比对（避免缺陷1）
- ✅ 不依赖结果数量（避免缺陷2）
- ✅ 外层调用者能正确响应（避免缺陷3）
- ✅ 适用于所有搜索场景

---

## 📈 预期效果

### 修复前
- 搜索"BE氛围「宿命感」虐文/小说灵感"
- 20+ 次API请求
- 30+ 秒响应时间
- 页面卡死

### 修复后
- 搜索"BE氛围「宿命感」虐文/小说灵感"
- 最多20次API请求（10秒内）
- 第20次请求后立即停止
- 显示"搜索频率过高"提示
- 10秒后可再次搜索

---

## 🔧 后续优化建议

1. **添加用户提示**: 当触发限流时，通过 Toast 提示用户
2. **优化搜索策略**: 对于无结果的搜索，快速失败，不尝试所有音乐源
3. **智能降级**: 记录哪些关键词无结果，下次直接跳过
4. **分词搜索**: 对于复杂关键词，自动简化后再搜索

---

