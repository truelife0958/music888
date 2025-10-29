# 🚀 Vercel部署指南

## 当前状态

✅ 代码已推送到GitHub
- 仓库: https://github.com/truelife0958/music888
- 最新commit: ab2bffd
- 包含完整的三大功能模块（发现音乐、为我推荐、播客电台）

## 部署方案

### 方案1：通过Vercel网站手动触发部署（推荐 ⭐）

这是最简单直接的方式，无需安装任何CLI工具。

#### 步骤：

1. **访问Vercel控制台**
   - 打开浏览器访问: https://vercel.com/dashboard
   - 使用你的GitHub账号登录

2. **找到项目**
   - 在Projects列表中找到 `music888` 项目
   - 点击项目名称进入项目详情页

3. **触发重新部署**
   - 点击页面右上角的 **"Deployments"** 标签
   - 点击 **"Redeploy"** 按钮（通常在最新部署的右侧）
   - 或者点击右上角的三个点菜单，选择 **"Redeploy"**

4. **选择部署选项**
   - 确认选择最新的commit（ab2bffd）
   - 勾选 **"Use existing Build Cache"**（可选，加快部署）
   - 点击 **"Redeploy"** 确认

5. **等待部署完成**
   - 部署通常需要1-3分钟
   - 可以在Deployments页面查看实时日志
   - 部署成功后会显示绿色的 ✓ 标记

6. **验证部署**
   - 访问你的部署地址: https://music888-4swa.vercel.app
   - 检查新功能是否正常工作

---

### 方案2：启用GitHub自动部署

如果你希望以后每次推送代码都自动部署，可以配置自动部署。

#### 步骤：

1. **检查GitHub集成**
   - 访问Vercel项目设置: https://vercel.com/dashboard/music888/settings
   - 点击左侧菜单的 **"Git"** 选项
   - 确认已连接到GitHub仓库

2. **配置自动部署**
   - 在Git设置页面，确保以下选项已启用：
     - ✅ **Production Branch**: main（或master）
     - ✅ **Deploy on Push**: 启用
     - ✅ **Auto-deploy**: 启用

3. **保存设置**
   - 点击 **"Save"** 保存配置
   - 以后每次 `git push` 都会自动触发部署

---

### 方案3：使用Vercel CLI（高级用户）

如果你需要更多控制或自动化部署，可以使用Vercel CLI。

#### 安装Vercel CLI：

```bash
npm install -g vercel
```

#### 首次登录：

```bash
vercel login
```

#### 部署到生产环境：

```bash
# 在项目根目录执行
vercel --prod
```

#### 查看部署状态：

```bash
vercel ls
```

---

## 部署后验证清单

部署完成后，请验证以下功能：

### ✅ 核心页面
- [ ] 主页 (index.html) 正常加载
- [ ] CSS样式正确应用
- [ ] JavaScript功能正常

### ✅ API代理
- [ ] `/api/music-proxy` 正常工作
- [ ] `/api/bilibili-proxy` 正常工作
- [ ] 其他API端点正常响应

### ✅ 新功能模块
- [ ] **发现音乐** (js/discover.ts)
  - [ ] 推荐歌单显示正常
  - [ ] 新歌速递地区筛选工作
  - [ ] 排行榜数据加载正常

- [ ] **为我推荐** (js/recommend.ts)
  - [ ] 每日推荐功能
  - [ ] 推荐歌单展示
  - [ ] 推荐MV显示

- [ ] **播客电台** (js/podcast.ts)
  - [ ] 电台分类加载
  - [ ] 推荐电台显示
  - [ ] 节目列表正常

### ✅ 静态资源
- [ ] 图片加载正常
- [ ] CSS文件加载（包括新增的discover.css）
- [ ] JavaScript模块加载

---

## 常见问题

### Q1: 为什么部署后看不到新功能？

**可能原因：**
1. 浏览器缓存 - 按 `Ctrl + Shift + R` 强制刷新
2. CDN缓存 - 等待1-2分钟让CDN更新
3. 构建缓存 - 在Vercel重新部署时不勾选"Use existing Build Cache"

### Q2: 如何查看部署日志？

1. 访问Vercel项目的Deployments页面
2. 点击具体的部署记录
3. 查看Build Logs和Function Logs

### Q3: 部署失败怎么办？

1. 检查vercel.json配置是否正确
2. 确认package.json中的build脚本正常
3. 查看部署日志中的错误信息
4. 确认所有依赖都已正确安装

### Q4: 如何回滚到之前的版本？

1. 在Deployments页面找到之前的成功部署
2. 点击该部署右侧的三个点菜单
3. 选择 "Promote to Production"

---

## 技术支持

### Vercel文档
- 官方文档: https://vercel.com/docs
- 部署指南: https://vercel.com/docs/deployments/overview
- Git集成: https://vercel.com/docs/git

### 项目信息
- GitHub仓库: https://github.com/truelife0958/music888
- API地址: https://music888-4swa.vercel.app
- 参考网站: https://music.zrfme.com

### 联系方式
如有问题，请在GitHub仓库提Issue或联系项目维护者。

---

## 部署时间线

```
代码提交 (GitHub)
     ↓
  触发部署
     ↓
  构建阶段 (1-2分钟)
  - 安装依赖
  - 运行build脚本
  - 生成dist目录
     ↓
  部署阶段 (30秒-1分钟)
  - 上传文件到CDN
  - 配置Serverless Functions
  - 更新域名解析
     ↓
  部署完成 ✓
  - 旧版本保留
  - 新版本上线
  - CDN全球分发
```

---

## 下次更新流程

以后添加新功能时，只需要：

1. **编写代码**
   ```bash
   # 开发和测试
   npm run dev
   ```

2. **提交到Git**
   ```bash
   git add .
   git commit -m "描述你的更新"
   git push
   ```

3. **等待自动部署**
   - 如果启用了自动部署，推送后会自动触发
   - 否则在Vercel控制台手动点击Redeploy

4. **验证上线**
   - 访问部署地址验证功能
   - 检查是否有报错

---

**最后更新**: 2025-10-29
**文档版本**: 1.0