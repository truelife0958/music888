# 音乐API源说明文档

## 📋 当前项目使用的API配置

### ✅ 代码中的配置（正确）
项目代码 `js/api.ts` 第54-65行配置了以下API源：

1. **GDStudio 音乐API（主要）**
   - URL: `https://music-api.gdstudio.xyz/api.php`
   - 类型: Standard格式
   - 优先级: 1（主要API）

2. **自建Vercel API（备用）**
   - URL: `https://music888-4swa.vercel.app/api.php`
   - 类型: Standard格式
   - 优先级: 2（备用API）

### ❌ 生产环境实际使用的API（旧配置）
根据2025-11-04控制台日志显示，生产环境实际使用：

1. `/api/meting` - 本地Meting API
2. `https://api.injahow.cn/meting` - 有CORS问题
3. `https://api.i-meto.com/meting/api` - 公共服务2

---

## 🔥 问题原因

**生产环境使用的是旧版本代码！** 原因可能是：

1. ✅ **代码已修改** - `js/api.ts` 已更新为GDStudio API
2. ❌ **未重新构建** - 修改后没有运行 `npm run build`
3. ❌ **未重新部署** - 构建产物未推送到生产环境
4. ❌ **浏览器缓存** - 使用了旧的JS文件缓存

---

## 🚀 立即修复步骤

### 步骤1：重新构建项目
```bash
cd d:/ebak/project/music888
npm run build
```

### 步骤2：确认构建产物
检查 `dist/` 目录下的文件是否更新：
- `dist/assets/index-*.js` 文件应包含 `music-api.gdstudio.xyz`

### 步骤3：推送到Git
```bash
git add .
git commit -m "fix: 使用GDStudio API配置"
git push origin main
```

### 步骤4：验证Vercel部署
1. 访问 Vercel 控制台
2. 查看部署日志，确认使用最新代码
3. 部署完成后，强制刷新浏览器 `Ctrl+Shift+R`

### 步骤5：清除浏览器缓存
- 方法1: `Ctrl+Shift+R` 硬刷新
- 方法2: 清除站点数据 (F12 → Application → Clear Storage)
- 方法3: 使用隐私模式测试

---

## 📊 验证方法

部署后，打开浏览器控制台，应该看到：

```
✅ 正确的日志：
🔧 [API初始化] 当前API配置: {
  初始API: 'https://music-api.gdstudio.xyz/api.php',
  API索引: 0,
  可用API列表: ['GDStudio 音乐API（主要）', '自建Vercel API（备用）']
}
```

而不是：
```
❌ 旧的日志：
🔧 [API初始化] 当前API配置: {
  初始API: '/api/meting',
  可用API列表: Array(3)  // 包含旧的Meting API
}
```

---

## 🎯 API格式说明

### Standard格式（GDStudio API）
```
搜索: ?types=search&source=netease&name=关键词&count=100
获取URL: ?types=url&source=netease&id=歌曲ID&br=320
```

### Meting格式（旧API）
```
搜索: ?server=netease&type=search&name=关键词&count=100
获取URL: ?server=netease&type=url&id=歌曲ID&br=320
```

项目代码已兼容两种格式，但优先使用Standard格式。

---

## 📝 相关文件

- **API配置**: `js/api.ts` (第54-65行)
- **API初始化日志**: `js/api.ts` (第88-93行)
- **API测试逻辑**: `js/api.ts` (第95-134行)
- **构建配置**: `vite.config.ts`
- **部署配置**: `vercel.json`

---

## ⚠️ 注意事项

1. **每次修改代码后必须重新构建**: `npm run build`
2. **构建后必须推送到Git**: `git push`
3. **Vercel会自动部署**: 推送后等待1-2分钟
4. **部署后清除缓存**: 强制刷新浏览器

---

## 🔗 相关链接

- GDStudio API文档: https://music-api.gdstudio.xyz/
- 自建Vercel API: https://music888-4swa.vercel.app/api.php
- Vercel项目: https://vercel.com/dashboard

---

最后更新: 2025-11-04 08:07 CST