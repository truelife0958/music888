# 🎵 沄听 - 在线音乐播放器

一个简洁、现代化的在线音乐播放器，支持多平台音乐搜索和播放。

[![在线演示](https://img.shields.io/badge/在线演示-music888.pages.dev-ff6b6b?style=for-the-badge&logo=cloudflare)](https://music8889.pages.dev/)
[![GitHub stars](https://img.shields.io/github/stars/truelife0958/music888?style=social)](https://github.com/truelife0958/music888)
[![License](https://img.shields.io/github/license/truelife0958/music888)](LICENSE)

---

## 📑 目录

- [✨ 核心特性](#-核心特性)
- [🚀 快速开始](#-快速开始)
- [📖 使用指南](#-使用指南)
- [🚀 部署指南](#-部署指南)
- [❓ 常见问题](#-常见问题)
- [🤝 贡献指南](#-贡献指南)

---

## ✨ 核心特性

| 功能 | 描述 |
|------|------|
| 🎵 **多平台音乐源** | 支持网易云、QQ音乐、酷狗、酷我等多个平台 |
| 🎚️ **多音质播放** | 标准/较高/高品质/无损(FLAC)，最高支持FLAC |
| 📝 **实时歌词** | 双语歌词同步显示，支持手动调节 |
| 📱 **响应式设计** | 完美适配桌面和移动端 |
| 🎨 **简洁界面** | 现代化UI设计，操作简单直观 |
| 📥 **批量操作** | 批量收藏、下载、播放 |
| 🔄 **智能切换** | 版权受限自动切换平台 |
| ⚡ **流畅体验** | 虚拟滚动、懒加载，流畅丝滑 |

---

## 🚀 快速开始

### 🌐 在线体验

**[🎵 立即体验 →](https://music888.pages.dev/)** 无需安装，即刻使用

**备用地址**: [https://music.weny888.com/](https://music.weny888.com/)

### 💻 本地运行

```bash
# 1. 克隆项目
git clone https://github.com/truelife0958/music888.git
cd music888

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev

# 4. 浏览器访问
# http://localhost:5173
```

### 🏗️ 构建生产版本

```bash
# 构建
npm run build

# 预览构建结果
npm run preview
```

---

## 📖 使用指南

### 🎵 搜索音乐

1. 在搜索框输入歌曲名、歌手或专辑
2. 选择音乐平台（默认：网易云音乐）
3. 点击搜索或按回车键
4. 点击歌曲卡片开始播放

**搜索技巧**：
- 输入完整歌名可获得更精确的结果
- 同时搜索歌手和歌曲名效果更好，如"周杰伦 晴天"
- 结果会智能过滤不相关内容，自动去重

### 🎤 浏览歌手

1. 切换到"歌手"标签页
2. 选择"男歌手"或"女歌手"分类
3. 浏览60位热门华语歌手
4. 点击"加载更多"查看更多歌手
5. 点击歌手卡片查看该歌手的热门歌曲

### 🏆 排行榜

1. 切换到"歌单"标签页
2. 浏览20个热门排行榜
3. 点击"加载更多"查看更多排行榜
4. 选择感兴趣的榜单查看详情
5. 点击歌曲即可播放

**支持的榜单**：
- 国内榜：飙升榜、新歌榜、热歌榜、原创榜、说唱榜、电音榜、抖音榜
- 国际榜：美国Billboard榜、英国UK榜、韩国Melon榜、日本公信榜
- 特色榜：ACG音乐榜、云音乐欧美热歌榜、古典音乐榜等

### 📝 解析歌单

1. 在"歌单"标签页找到"解析网易云歌单"区域
2. 输入网易云歌单ID或完整链接
   - **示例ID**：`60198`
   - **示例链接**：`https://music.163.com/#/playlist?id=60198`
3. 点击"解析"按钮
4. 等待解析完成，显示歌单内所有歌曲

### 🎛️ 播放器控制

**播放模式**：
- 🔁 列表循环
- 🔀 随机播放
- 🔂 单曲循环

**音质选择**：
- 🎵 标准音质 (128K)
- 🎶 较高音质 (192K)
- 🎸 高品质 (320K) - 推荐
- 💎 无损音质 (FLAC) - 视版权而定

**播放列表**：
- 点击播放列表按钮查看当前播放队列
- 可以删除、清空播放列表
- 支持拖拽调整播放顺序

### 📝 歌词功能

- **实时滚动歌词**：歌词随播放进度自动滚动
- **双语显示**：支持原文+翻译同时显示
- **手动调节**：歌词不同步时，可使用调节按钮微调（±0.5秒步进）

### ☑️ 批量操作

1. 勾选想要操作的歌曲（支持全选/反选）
2. 点击批量操作栏按钮：
   - **批量收藏**：添加到"我的喜欢"列表
   - **批量下载**：下载选中的歌曲到本地
   - **批量播放**：将选中歌曲添加到播放列表

### 📱 移动端使用

**手势操作**：
- 👈 左滑：切换到下一页
- 👉 右滑：切换到上一页
- 👆👇 上下滑动：浏览内容

**页面切换**：
- 搜索结果 ← → 播放器 ← → 统计数据
- 点击底部圆点快速切换

**优化功能**：
- 三栏横向滑动，自然流畅
- 无横向滚动条，视觉更整洁
- 触摸热区优化，点击更准确

---

## 🚀 部署指南

### 🚀 一键部署

#### 方式1：Cloudflare Pages（推荐）

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/truelife0958/music888)

**特点**：
- ✅ 全球CDN加速
- ✅ 免费SSL证书
- ✅ 自动部署
- ✅ 无限带宽

#### 方式2：Vercel

[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/truelife0958/music888)

**特点**：
- ✅ 快速部署
- ✅ 自动HTTPS
- ✅ GitHub集成
- ✅ 边缘网络

### 📋 手动部署

#### Cloudflare Pages 部署步骤

1. **Fork仓库**
   - 访问 [https://github.com/truelife0958/music888](https://github.com/truelife0958/music888)
   - 点击右上角"Fork"按钮

2. **创建项目**
   - 登录 [Cloudflare Pages](https://pages.cloudflare.com/)
   - 点击"创建项目"
   - 选择你Fork的仓库

3. **配置构建**
   ```
   构建命令: npm run build
   构建输出目录: dist
   Node.js版本: 18
   ```

4. **部署**
   - 点击"保存并部署"
   - 等待1-2分钟完成
   - 获取部署地址（如：your-project.pages.dev）

#### Vercel 部署步骤

1. **登录Vercel**
   - 访问 [Vercel](https://vercel.com/)
   - 使用GitHub账号登录

2. **导入项目**
   - 点击"New Project"
   - 选择你Fork的仓库
   - Vercel会自动检测配置

3. **部署**
   - 点击"Deploy"
   - 等待部署完成
   - 获取部署地址（如：your-project.vercel.app）

### 🌐 自定义域名

#### Cloudflare Pages

1. 进入项目设置
2. 选择"Custom domains"
3. 添加你的域名
4. 配置DNS记录（自动生成）
5. 等待SSL证书自动配置

#### Vercel

1. 进入项目设置
2. 选择"Domains"
3. 添加你的域名
4. 配置DNS记录（A记录或CNAME）
5. 等待SSL证书签发

### 🔧 环境变量配置（可选）

如需配置API密钥等，可在部署平台添加环境变量：

```
# Cloudflare Pages
Settings → Environment variables

# Vercel
Settings → Environment Variables
```

常见环境变量：
- `NODE_ENV=production` - 生产环境
- `VITE_API_BASE_URL` - API基础地址（如需自建API）

---

## ❓ 常见问题

### Q: 为什么有些歌曲无法播放？

**A:** 可能的原因和解决方法：

1. **版权限制**
   - 系统会自动尝试其他平台
   - 手动切换平台搜索

2. **网络问题**
   - 检查网络连接
   - 尝试刷新页面

3. **音质过高**
   - 选择较低音质（320K或192K）
   - FLAC无损音质可能受限

4. **音乐源不可用**
   - 尝试不同平台搜索
   - 切换其他音乐源

### Q: 如何提高播放成功率？

**A:** 以下技巧可提高成功率：

1. **选择合适音质**
   - 推荐使用高品质320K
   - FLAC音质部分歌曲不可用

2. **多平台尝试**
   - 网易云、QQ音乐、酷狗等
   - 不同平台版权不同

3. **网络优化**
   - 确保网络连接稳定
   - 清除浏览器缓存

4. **搜索技巧**
   - 使用准确的歌曲名和歌手名
   - 避免使用特殊字符

### Q: 支持锁屏播放吗？

**A:** 完全支持！

- ✅ 支持息屏持续播放
- ✅ 锁屏界面显示歌曲信息
- ✅ 锁屏控制播放/暂停/切歌
- ✅ 支持耳机线控
- ✅ 支持蓝牙设备控制

### Q: 数据会丢失吗？

**A:** 数据安全说明：

- 所有数据保存在本地浏览器
- 包括：播放历史、收藏列表、设置
- 不会上传到服务器
- 清除浏览器数据会导致数据丢失
- 建议定期导出重要歌单

### Q: 移动端如何操作？

**A:** 移动端操作指南：

- **切换页面**：左右滑动或点击底部圆点
- **浏览内容**：上下滑动
- **播放歌曲**：点击歌曲卡片
- **控制播放**：使用播放器按钮
- **查看歌词**：播放器页面自动显示

### Q: 如何下载歌曲？

**A:** 两种方式：

1. **单曲下载**
   - 点击歌曲卡片上的下载按钮
   - 选择音质
   - 浏览器会自动下载

2. **批量下载**
   - 勾选多首歌曲
   - 点击"批量下载"按钮
   - 依次下载选中的歌曲

### Q: 歌词不同步怎么办？

**A:** 使用歌词调节功能：

1. 找到播放器下方的歌词调节按钮
2. 点击 `-` 按钮：歌词提前0.5秒
3. 点击 `+` 按钮：歌词延后0.5秒
4. 点击"重置"恢复默认
5. 调节会自动保存

---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 参与贡献

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/AmazingFeature`
3. 提交更改：`git commit -m 'feat: 添加某个功能'`
4. 推送分支：`git push origin feature/AmazingFeature`
5. 提交 Pull Request

### 提交规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

- `feat`: 新功能
- `fix`: 修复BUG
- `docs`: 文档更新
- `style`: 代码格式
- `refactor`: 代码重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具链

### 开发环境

```bash
# 安装依赖
npm install

# 启动开发服务器（支持热更新）
npm run dev

# 代码格式化
npm run format

# 代码检查
npm run lint

# 类型检查
npm run type-check

# 运行测试
npm test
```

---

## 📋 项目结构

```
music888/
├── css/
│   └── style.css              # 主样式文件
├── js/                        # TypeScript 源码
│   ├── main.ts               # 程序入口
│   ├── player.ts             # 播放器核心
│   ├── ui.ts                 # UI交互
│   ├── api.ts                # API封装
│   └── ...                   # 其他模块
├── public/
│   ├── manifest.json         # PWA配置
│   └── service-worker.js     # Service Worker
├── index.html                # 入口HTML
├── package.json              # 项目配置
├── tsconfig.json             # TypeScript配置
└── vite.config.ts            # Vite构建配置
```

---

## 📄 开源协议

本项目采用 [MIT 协议](LICENSE) - 详见 LICENSE 文件

## 🙏 致谢

- [music-api.gdstudio.xyz](https://music-api.gdstudio.xyz) - 音乐API服务
- [Font Awesome](https://fontawesome.com/) - 图标库
- [Vite](https://vitejs.dev/) - 极速构建工具
- 所有贡献者和使用者

## 📧 联系方式

- **GitHub**: [@truelife0958](https://github.com/truelife0958)
- **Issues**: [提交问题](https://github.com/truelife0958/music888/issues)
- **在线演示**: [https://music8889.pages.dev/](https://music8889.pages.dev/)
- **备用演示**: [https://music.weny888.com/](https://music.weny888.com/)

---

## 🌟 Star History

如果这个项目对您有帮助，请给个 Star 支持一下！

[![Star History Chart](https://api.star-history.com/svg?repos=truelife0958/music888&type=Date)](https://star-history.com/#truelife0958/music888&Date)

---

**享受音乐，享受生活！** 🎵✨

Made with ❤️ by [truelife0958](https://github.com/truelife0958)
