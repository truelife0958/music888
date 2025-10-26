# 音乐播放器修复部署指南

## 修复内容总结

### 1. API 代理修复 ✅
- **文件**: `api/music-proxy.js`
- **修复内容**:
  - 支持所有请求类型: `search`, `url`, `pic`, `lyric`, `playlist`
  - 完善参数验证
  - 添加响应数据验证
  - 优化错误处理

### 2. Bilibili 代理添加 ✅
- **文件**: `api/bilibili-proxy.js`
- **功能**:
  - 解决 CORS 跨域问题
  - 支持搜索和媒体源获取
  - 统一错误处理

### 3. 备份文件 ✅
- `api/music-proxy.js.backup` - 原 API 代理备份

## 部署步骤

### 方式一: Vercel 部署 (推荐)

#### 1. 提交代码到 Git

```bash
cd /d/ebak/project/music888

# 查看修改
git status

# 添加修改的文件
git add api/music-proxy.js
git add api/bilibili-proxy.js
git add OPTIMIZATION_PLAN.md
git add DEPLOYMENT_GUIDE.md

# 提交
git commit -m "fix: 修复 API 代理配置和 CORS 问题

- 扩展 music-proxy 支持所有请求类型
- 添加 bilibili-proxy 解决跨域问题
- 完善参数验证和错误处理
- 添加响应数据验证"

# 推送到远程仓库
git push origin main
```

#### 2. Vercel 自动部署

Vercel 会自动检测到代码变更并触发部署:

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 找到你的项目
3. 查看部署状态
4. 等待部署完成 (通常 1-2 分钟)

#### 3. 验证部署

部署完成后,访问你的网站并测试:

```bash
# 测试 API 代理
curl "https://your-domain.vercel.app/api/music-proxy?types=search&source=netease&name=晴天&count=10"

# 测试 Bilibili 代理
curl "https://your-domain.vercel.app/api/bilibili-proxy?action=search&query=晴天&limit=10"
```

### 方式二: 手动部署

如果不使用 Git,可以手动部署:

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择你的项目
3. 点击 "Settings" → "General"
4. 找到 "Build & Development Settings"
5. 上传修改的文件:
   - `api/music-proxy.js`
   - `api/bilibili-proxy.js`

## 前端代码更新 (可选)

### 更新 Bilibili API 调用

如果前端代码中直接调用了 Bilibili API,需要更新为使用代理:

```typescript
// js/api.ts

// 旧代码
const BILIBILI_API_BASE = 'https://api.cenguigui.cn/api/bilibili/bilibili.php';

// 新代码
const BILIBILI_API_BASE = '/api/bilibili-proxy';

// 搜索调用示例
async function searchBilibiliMusic(keyword: string) {
    const url = `${BILIBILI_API_BASE}?action=search&query=${encodeURIComponent(keyword)}&limit=100`;
    const response = await fetch(url);
    return await response.json();
}

// 媒体源调用示例
async function getBilibiliMediaUrl(bvid: string, quality: string = 'high') {
    const url = `${BILIBILI_API_BASE}?action=media&bvid=${bvid}&quality=${quality}`;
    const response = await fetch(url);
    return await response.json();
}
```

### 修复混合内容警告

```typescript
// js/api.ts

export async function getAlbumCoverUrl(song: Song): Promise<string> {
    const url = await fetchCoverUrl(song);
    
    // 强制使用 HTTPS
    if (url.startsWith('http://')) {
        return url.replace('http://', 'https://');
    }
    
    return url;
}
```

## 测试清单

部署后请测试以下功能:

### 基础功能
- [ ] 搜索歌曲 (网易云、QQ音乐、酷狗)
- [ ] 播放歌曲
- [ ] 显示专辑封面
- [ ] 显示歌词
- [ ] 切换音质

### Bilibili 功能
- [ ] 搜索 Bilibili 音乐
- [ ] 播放 Bilibili 音乐
- [ ] 显示 Bilibili 封面

### 错误处理
- [ ] API 失败自动切换
- [ ] 音质降级
- [ ] 音乐源降级
- [ ] 错误提示

## 监控和日志

### Vercel 日志查看

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择你的项目
3. 点击 "Deployments"
4. 选择最新的部署
5. 点击 "Functions" 查看 Serverless 函数日志

### 浏览器控制台

打开浏览器开发者工具 (F12),查看:
- Console 标签: 查看前端日志
- Network 标签: 查看 API 请求

## 性能优化建议

### 1. 启用 Vercel Edge Functions (可选)

将 API 代理部署到边缘节点以提升速度:

```javascript
// api/music-proxy.js
export const config = {
    runtime: 'edge',
};
```

### 2. 添加缓存 (可选)

```javascript
// api/music-proxy.js
export default async function handler(req, res) {
    // 设置缓存头
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    
    // ... 其他代码
}
```

### 3. 启用 Gzip 压缩

Vercel 默认启用,无需配置。

## 回滚方案

如果部署后出现问题:

### 方式一: Git 回滚

```bash
# 回滚到上一个提交
git revert HEAD
git push origin main
```

### 方式二: Vercel 回滚

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择你的项目
3. 点击 "Deployments"
4. 找到之前的稳定版本
5. 点击 "..." → "Promote to Production"

### 方式三: 手动回滚

```bash
# 恢复备份文件
mv api/music-proxy.js.backup api/music-proxy.js

# 删除 Bilibili 代理
rm api/bilibili-proxy.js

# 提交并推送
git add api/music-proxy.js
git commit -m "revert: 回滚 API 修复"
git push origin main
```

## 常见问题

### Q1: 部署后仍然出现 400 错误?

**A**: 检查以下几点:
1. 确认文件已正确上传
2. 清除浏览器缓存
3. 检查 Vercel 函数日志
4. 确认 API 参数正确

### Q2: Bilibili 音乐无法播放?

**A**: 
1. 确认 `api/bilibili-proxy.js` 已部署
2. 检查前端代码是否更新了 API 地址
3. 查看浏览器控制台错误信息

### Q3: 图片显示混合内容警告?

**A**: 
1. 确认前端代码已添加 HTTPS 转换
2. 清除浏览器缓存
3. 强制刷新页面 (Ctrl+F5)

### Q4: 部署后性能变慢?

**A**: 
1. 考虑启用 Edge Functions
2. 添加适当的缓存策略
3. 检查 API 超时设置

## 联系支持

如果遇到问题:
1. 查看 Vercel 函数日志
2. 检查浏览器控制台
3. 参考 `OPTIMIZATION_PLAN.md`
4. 提交 Issue 到项目仓库

## 下一步优化

完成部署后,可以考虑:
1. 优化前端 API 调用逻辑
2. 实现智能音质降级
3. 添加音乐源统计
4. 优化错误提示

---

**部署日期**: $(date +%Y-%m-%d)
**版本**: v1.1.0
**状态**: ✅ 已修复
