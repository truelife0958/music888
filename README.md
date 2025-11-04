# 🎵 云音乐播放器

一个功能强大、现代化的在线音乐播放器，支持多平台音乐搜索、播放和歌单管理。

## ⚡ 快速开始

### 🌐 在线访问

**[立即体验](https://music.weny888.com/)** - 无需安装，即刻使用

### 🚀 一键部署

#### 方式一：使用 Deploy Button（推荐）

[![Deploy to Cloudflare Pages](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/truelife0958/music888)

点击按钮后按照提示操作，2分钟即可完成部署。

#### 方式二：手动部署到 Cloudflare Pages

1. **Fork 本仓库**
   - 访问 [GitHub仓库](https://github.com/truelife0958/music888)
   - 点击右上角 `Fork` 按钮

2. **登录 Cloudflare**
   - 访问 [Cloudflare Pages](https://pages.cloudflare.com/)
   - 使用你的账号登录（没有账号请先注册，完全免费）

3. **创建项目**
   - 点击 `Create a project` 按钮
   - 选择 `Connect to Git`
   - 授权 Cloudflare 访问你的 GitHub 账号

4. **选择仓库**
   - 找到并选择你 Fork 的 `music888` 仓库
   - 点击 `Begin setup`

5. **配置构建设置**
   ```
   项目名称: music888（或自定义）
   生产分支: main
   构建命令: npm run build
   构建输出目录: dist
   ```
   - 环境变量：无需配置
   - 点击 `Save and Deploy`

6. **等待部署完成**
   - 首次部署约需 1-2 分钟
   - 部署成功后会自动生成域名：`your-project.pages.dev`

7. **绑定自定义域名（可选）**
   - 进入项目设置 → Custom domains
   - 添加你的域名并按提示配置 DNS 记录

#### 方式三：部署到 Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/truelife0958/music888)

#### 方式四：部署到 Netlify

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/truelife0958/music888)

### 💻 本地运行

```bash
# 克隆项目
git clone https://github.com/truelife0958/music888.git

# 进入目录
cd music888

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

开发服务器启动后访问 `http://localhost:5173`

## ✨ 核心功能

### 🎼 多平台音乐源
- 支持 7 个音乐平台：网易云、QQ音乐、酷狗、酷我、虾米、百度、Bilibili
- 智能音乐源切换：版权受限时自动尝试其他平台
- 动态优先级调度：根据成功率自动优化音乐源顺序

### 🎚️ 播放控制
- 高品质播放：支持标准(128K)、较高(192K)、高品质(320K)、无损(FLAC)
- 品质自动降级：高品质不可用时自动尝试低品质
- 播放模式：列表循环、随机播放、单曲循环
- 倍速播放：0.5x - 2.0x 可调
- 后台播放：支持锁屏播放和媒体控制

### 📝 歌词功能
- 实时歌词显示：同步滚动
- 歌词下载：LRC 格式

### 📚 歌单管理
- 解析网易云歌单：支持歌单ID或完整链接
- 播放历史：自动记录最近50首
- 我的喜欢：收藏功能
- 批量操作：批量下载、批量收藏

### 📥 下载功能
- 歌曲下载：支持多种品质
- 批量下载：一键下载整个歌单（最多50首）

### 🎨 用户体验
- 响应式设计：完美适配桌面和移动端
- 移动端三屏滑动：内容区 ↔ 播放器 ↔ 我的
- 键盘快捷键：空格播放/暂停、方向键控制
- PWA 支持：可安装到桌面

## 📖 使用指南

### 搜索音乐
1. 在搜索框输入歌曲名、歌手或专辑
2. 选择音乐平台（默认：网易云音乐）
3. 点击搜索或按回车
4. 点击歌曲开始播放

### 解析歌单
1. 切换到"解析歌单"标签
2. 输入网易云歌单ID（如：`60198`）或完整链接
3. 点击"解析歌单"
4. 支持保存和批量下载

### 移动端操作
- 左右滑动切换页面
- 底部圆点显示当前页面
- 触摸优化，流畅体验

## 🔧 技术栈

**前端**
- TypeScript - 类型安全
- Vite - 快速构建
- CSS3 - 现代样式
- Service Worker - PWA 支持

**后端**
- Cloudflare Workers - 边缘计算
- Cloudflare Pages - 静态托管

**存储**
- LocalStorage - 本地数据持久化

## 📋 项目结构

```
music888/
├── functions/              # Cloudflare Workers API
│   └── api/
│       └── [[path]].js    # 音乐API代理（通配符路由）
├── css/
│   └── style.css          # 主样式
├── js/                    # TypeScript 源码
│   ├── api.ts            # API 调用
│   ├── main.ts           # 程序入口
│   ├── player.ts         # 播放器逻辑
│   ├── ui.ts             # UI 交互
│   ├── config.ts         # 配置
│   └── utils.ts          # 工具函数
├── public/
│   ├── manifest.json     # PWA 配置
│   └── service-worker.js # Service Worker
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── wrangler.toml         # Cloudflare 配置
```

## ❓ 常见问题

**Q: 为什么有些歌曲无法播放？**
- 可能的原因：版权限制、网络问题、音乐源不可用
- 解决方案：系统会自动尝试其他平台，或手动切换平台搜索

**Q: 如何提高播放成功率？**
1. 选择较低品质（320K 或 192K）
2. 尝试不同音乐平台
3. 检查网络连接

**Q: 支持锁屏播放吗？**
- ✅ 支持息屏持续播放
- ✅ 锁屏界面显示歌曲信息和控制按钮
- ✅ 支持耳机线控和蓝牙设备控制

**Q: 键盘快捷键有哪些？**
- `空格`: 播放/暂停
- `←/→`: 上一曲/下一曲
- `↑/↓`: 音量增加/减少
- `M`: 切换播放模式
- `L`: 打开/关闭歌词

## 🎯 性能指标

- 🚀 首屏加载时间: < 1.5s
- 📦 构建产物大小: ~450KB
- 📊 Lighthouse 评分: 95+
- 💾 支持离线缓存
- 📱 完美适配 320px - 2560px
- 🎨 动画性能: 60fps

## 📝 更新日志

### v3.1.0 (2025-11-04) - 最新版本

#### 🐛 紧急修复
- ✅ 修复 API 404 错误：使用通配符路由 `[[path]].js` 匹配所有 `/api/*` 请求
- ✅ 解决 Cloudflare Functions 路由不匹配问题

#### ⚡ 性能优化（已完成）
- ✅ 代码分割：构建产物减少 44%（800KB → 450KB）
- ✅ Tree Shaking：优化未使用代码
- ✅ 虚拟滚动：长列表 DOM 节点减少 98%（1000 → 20）
- ✅ 资源预加载：DNS-prefetch、preconnect

#### 🛡️ 安全修复
- ✅ XSS 防护：HTML 属性转义
- ✅ 内存泄漏：全局 cleanup 机制
- ✅ API 验证：URL 有效性检查

#### 📱 移动端优化
- ✅ 触摸手势优化：区分水平/垂直滑动
- ✅ LocalStorage 智能清理：分级清理策略

### v3.0.1 (2025-10-31)
- ✅ 三屏滑动：支持左右滑动切换页面
- ✅ 触摸优化：防止内存泄漏
- ✅ 修复批量收藏和艺术家显示问题

### v2.0.0
- ✅ 智能多音乐源切换
- ✅ 动态优先级调度
- ✅ 网络超时优化和降级策略

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/AmazingFeature`
3. 提交更改：`git commit -m 'feat: 添加某个功能'`
4. 推送分支：`git push origin feature/AmazingFeature`
5. 提交 Pull Request

### 提交规范
- `feat`: 新功能
- `fix`: 修复BUG
- `docs`: 文档更新
- `perf`: 性能优化
- `refactor`: 代码重构

## 📄 开源协议

本项目采用 MIT 协议 - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

- [music-api.gdstudio.xyz](https://music-api.gdstudio.xyz) - 音乐API服务
- [Font Awesome](https://fontawesome.com/) - 图标库
- [Vite](https://vitejs.dev/) - 构建工具
- 所有贡献者和使用者

## 📧 联系方式

- GitHub: [@truelife0958](https://github.com/truelife0958)
- Issues: [提交问题](https://github.com/truelife0958/music888/issues)
- 在线演示: [https://music.weny888.com/](https://music.weny888.com/)

## 📊 项目状态

![GitHub stars](https://img.shields.io/github/stars/truelife0958/music888?style=social)
![GitHub forks](https://img.shields.io/github/forks/truelife0958/music888?style=social)
![GitHub issues](https://img.shields.io/github/issues/truelife0958/music888)
![GitHub license](https://img.shields.io/github/license/truelife0958/music888)

---

⭐ 如果这个项目对您有帮助，请给个 Star 支持一下！

**享受音乐，享受生活！** 🎵✨
