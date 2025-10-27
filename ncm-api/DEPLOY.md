# 🚀 自建API部署指南

本指南将帮助你将 `ncm-api` 部署到Vercel，打造专属的音乐API服务！

---

## 📋 部署前准备

### 1. 确保你有以下账号
- ✅ [GitHub账号](https://github.com)
- ✅ [Vercel账号](https://vercel.com)（可以用GitHub登录）

### 2. 确认代码已提交
```bash
# 查看git状态
git status

# 如果有未提交的更改，先提交
git add .
git commit -m "feat: 添加自建ncm-api服务"
git push
```

---

## 🎯 方式一：通过Vercel Dashboard部署（推荐）

### 步骤1：创建新项目
1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 **"Add New..."** → **"Project"**
3. 选择你的GitHub仓库 `music888`
4. 点击 **"Import"**

### 步骤2：配置项目
在配置页面：

1. **Project Name**: 填写项目名称（如 `music888-ncm-api`）

2. **Root Directory**:
   - 点击 **"Edit"**
   - 选择 `ncm-api` 文件夹
   - ✅ **重要：这一步不能跳过！**

3. **Framework Preset**:
   - 选择 **"Other"**

4. **Build Command** (可选):
   ```bash
   npm install
   ```

5. **Output Directory**: 留空

6. **Install Command**: 留空（使用默认）

### 步骤3：环境变量配置（可选）
点击 **"Environment Variables"** 添加：

| 变量名 | 值 | 说明 |
|--------|---|------|
| `CORS_ALLOW_ORIGIN` | `*` | 允许所有域名跨域访问 |
| `ENABLE_GENERAL_UNBLOCK` | `true` | 启用全局解灰功能 |
| `ENABLE_FLAC` | `true` | 启用无损音质 |

### 步骤4：部署
1. 点击 **"Deploy"**
2. 等待部署完成（约1-2分钟）
3. 部署成功后会看到 🎉 恭喜画面
4. 获取你的API地址，例如：`https://music888-ncm-api.vercel.app`

---

## 🔧 方式二：通过Vercel CLI部署

### 步骤1：安装Vercel CLI
```bash
npm i -g vercel
```

### 步骤2：登录Vercel
```bash
vercel login
```

### 步骤3：进入ncm-api目录并部署
```bash
cd ncm-api
vercel --prod
```

按提示操作即可完成部署。

---

## ✅ 验证部署

部署成功后，测试API是否正常工作：

### 1. 访问根路径
```
https://your-api.vercel.app/
```
应该返回：
```json
{
  "status": "ok",
  "message": "NeteaseCloudMusic API Enhanced is running",
  "version": "1.0.0"
}
```

### 2. 测试搜索接口
```
https://your-api.vercel.app/api.php?types=search&name=test&count=1
```
应该返回歌曲列表数组

### 3. 测试歌曲URL
```
https://your-api.vercel.app/api.php?types=url&id=186016&br=320000
```
应该返回：
```json
{
  "url": "https://...",
  "br": "320"
}
```

---

## 🔗 集成到主项目

### 方式1：修改API配置文件（推荐）

编辑 `js/api.ts`:

```typescript
const API_SOURCES: ApiSource[] = [
    {
        name: '自建 API',
        url: 'https://your-api.vercel.app/api.php',  // 👈 替换为你的API地址
        type: 'custom'
    },
    {
        name: 'Vercel 代理 API',
        url: '/api/music-proxy',
        type: 'proxy'
    },
    {
        name: '主 API',
        url: 'https://music-api.gdstudio.xyz/api.php'
    }
];
```

### 方式2：环境变量配置

创建 `.env.local`:
```
VITE_CUSTOM_API_URL=https://your-api.vercel.app/api.php
```

然后修改 `js/api.ts` 读取环境变量。

---

## 🎉 完成！

现在你有了：
- ✅ 自己的音乐API服务
- ✅ 无速率限制
- ✅ 支持自定义配置
- ✅ 完全免费

---

## 🐛 常见问题

### Q1: 部署失败，提示找不到模块？
**A**: 确保在Vercel配置中正确设置了 **Root Directory** 为 `ncm-api`

### Q2: API返回404？
**A**: 检查URL是否正确，确保包含 `/api.php` 路径

### Q3: 歌曲无法播放？
**A**: 某些歌曲可能因版权限制无法播放，这是正常现象

### Q4: 部署后修改代码如何更新？
**A**:
```bash
git add .
git commit -m "update: 更新配置"
git push
```
Vercel会自动重新部署

### Q5: 如何查看API日志？
**A**: 登录Vercel Dashboard → 选择项目 → 点击 **"Logs"** 标签

---

## 📚 更多资源

- [NeteaseCloudMusicApi文档](https://neteasecloudmusicapienhanced.js.org/)
- [Vercel文档](https://vercel.com/docs)
- [问题反馈](https://github.com/your-repo/issues)

---

**祝你部署顺利！🎸**
