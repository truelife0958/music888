# 🚀 Music888 双平台部署指南

## 当前部署状态

### Cloudflare Pages
- ✅ 已配置：wrangler.toml
- ✅ 已推送代码
- ⏳ 等待自动构建

### Vercel
- ✅ 已配置：vercel.json
- ⏳ 待部署

---

## 📦 方式1：Vercel CLI部署（推荐）

### 步骤1：登录Vercel

```bash
vercel login
```

选择登录方式：
- GitHub（推荐）
- GitLab
- Bitbucket
- Email

### 步骤2：首次部署

```bash
vercel
```

CLI会询问以下问题：
1. **Set up and deploy "music888"?** → 输入 `Y`
2. **Which scope do you want to deploy to?** → 选择你的账户
3. **Link to existing project?** → 输入 `N`（首次部署）
4. **What's your project's name?** → 输入 `music888` 或自定义
5. **In which directory is your code located?** → 按回车（当前目录）
6. **Want to override the settings?** → 输入 `N`（使用vercel.json配置）

### 步骤3：生产环境部署

首次部署后会生成预览URL，要部署到生产环境：

```bash
vercel --prod
```

### 步骤4：查看部署信息

```bash
vercel ls
```

---

## 📦 方式2：Vercel网页控制台部署（简单）

### 步骤1：导入项目

1. 访问 https://vercel.com/new
2. 点击 "Import Git Repository"
3. 选择 `truelife0958/music888` 仓库
4. 点击 "Import"

### 步骤2：配置项目

Vercel会自动检测到Vite项目，使用以下配置：
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

### 步骤3：部署

1. 点击 "Deploy" 按钮
2. 等待构建完成（约1-2分钟）
3. 获取生产环境URL

---

## 🔄 方式3：GitHub Actions自动部署（高级）

### 步骤1：创建GitHub Secrets

在GitHub仓库设置中添加：
- `VERCEL_TOKEN`：从 https://vercel.com/account/tokens 获取
- `VERCEL_ORG_ID`：运行 `vercel --token=<TOKEN>` 后查看
- `VERCEL_PROJECT_ID`：运行 `vercel --token=<TOKEN>` 后查看

### 步骤2：创建工作流文件

```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

---

## 🔍 部署后验证

### Cloudflare Pages

1. **访问控制台**
   - URL: https://dash.cloudflare.com
   - 进入 Pages → music888 → Deployments

2. **检查构建日志**
   ```
   Building...
   ✓ Build completed
   ✓ Deploying to production
   ```

3. **验证部署**
   ```bash
   curl -I https://music.weny888.com/
   ```

### Vercel

1. **访问控制台**
   - URL: https://vercel.com/dashboard
   - 查看 music888 项目

2. **检查部署状态**
   ```bash
   vercel ls
   ```

3. **验证部署**
   ```bash
   curl -I https://music888.vercel.app/
   ```

---

## 📊 双平台对比

| 特性 | Cloudflare Pages | Vercel |
|------|-----------------|--------|
| 构建速度 | ⚡ 快速 | ⚡⚡ 极快 |
| 全球CDN | ✅ 优秀 | ✅ 优秀 |
| 免费配额 | 500次构建/月 | 100GB带宽/月 |
| 自定义域名 | ✅ 免费 | ✅ 免费 |
| 自动SSL | ✅ | ✅ |
| Edge Functions | ✅ Workers | ✅ Edge Runtime |
| 构建时间 | ~2-3分钟 | ~1-2分钟 |
| 推荐场景 | 国内访问优化 | 国际访问优化 |

---

## 🛠️ 常见问题

### Q1: 构建失败怎么办？

**检查Node版本**
```bash
# 本地
node --version  # v22.20.0

# Vercel：在项目设置中设置
NODE_VERSION=18

# Cloudflare：已添加.nvmrc文件
```

### Q2: 如何更新部署？

**Cloudflare Pages**
- 自动：推送代码到main分支自动触发
- 手动：控制台点击 "Retry deployment"

**Vercel**
- 自动：推送代码到main分支自动触发
- 手动：运行 `vercel --prod`

### Q3: 如何回滚部署？

**Cloudflare Pages**
```
控制台 → Deployments → 选择历史版本 → Rollback
```

**Vercel**
```bash
vercel rollback
# 或在控制台选择历史部署点击 "Promote to Production"
```

### Q4: 如何绑定自定义域名？

**Cloudflare Pages**
```
项目设置 → Custom domains → Add domain
```

**Vercel**
```bash
vercel domains add music888.com
# 或在控制台 Domains 页面添加
```

---

## 🎯 推荐部署策略

### 策略1：双活部署
- Cloudflare Pages: 主域名 `music.weny888.com`
- Vercel: 备用域名 `music888.vercel.app`

### 策略2：地域分流
- Cloudflare Pages: 国内访问
- Vercel: 国际访问

### 策略3：灰度发布
- Cloudflare Pages: 稳定版本
- Vercel: 测试新功能

---

## 📞 获取帮助

- Cloudflare文档: https://developers.cloudflare.com/pages/
- Vercel文档: https://vercel.com/docs
- 项目Issue: https://github.com/truelife0958/music888/issues

