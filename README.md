# 🎵 云音乐播放器

一个功能强大的在线音乐播放器,支持多平台音乐搜索、播放、下载和歌单管理。

## ✨ 主要特性

### 🎼 多平台音乐源支持
- 🎧 **12个音乐平台**:网易云音乐、QQ音乐、JOOX、酷狗音乐、咪咕音乐、Deezer、Spotify、Apple Music、YouTube Music、TIDAL、Qobuz、喜马拉雅
- 🔍 **智能搜索**: 跨平台搜索您喜欢的歌曲
- 📡 **探索雷达**: 一键发现热门音乐

### 🎚️ 播放功能
- ▶️ **高品质播放**: 支持标准(128K)、较高(192K)、高品质(320K)、无损(FLAC)、Hi-Res
- 🔄 **品质自动降级**: 当高品质不可用时,自动尝试更低品质,确保播放成功率
- 🎛️ **播放模式**: 列表循环、随机播放、单曲循环
- ⏮️ ⏭️ **上一曲/下一曲**: 流畅的播放控制
- 🔊 **音量控制**: 精细的音量调节

### 📝 歌词功能
- 📄 **实时歌词显示**: 同步显示歌词
- 💾 **歌词下载**: 下载 LRC 格式歌词文件

### 📚 歌单管理
- 🔖 **解析网易云歌单**: 支持歌单ID或完整链接
- 💾 **保存歌单**: 本地保存您喜欢的歌单
- ❤️ **我的喜欢**: 收藏您最爱的歌曲
- 📦 **批量下载**: 一键下载整个歌单

### 📥 下载功能
- ⬇️ **歌曲下载**: 下载高品质音乐文件
- 📜 **歌词下载**: 下载同步歌词文件

### 🎨 用户体验
- 🌈 **精美界面**: 现代化的渐变背景和动画效果
- 📱 **响应式设计**: 完美适配桌面和移动设备
- 🔔 **智能提示**: 详细的操作反馈和错误提示
- 💾 **本地存储**: 自动保存播放历史和收藏

## 🚀 快速开始

### 在线访问

🌐 **[在线演示](https://music.weny888.com/)** - 立即体验

### 一键部署到 Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/truelife0958/music888)

点击上方按钮即可一键部署到 Vercel,完全免费!

#### 部署步骤:

1. **点击部署按钮** - 点击上方的 "Deploy with Vercel" 按钮
2. **登录 Vercel** - 使用 GitHub 账号登录 Vercel
3. **克隆仓库** - Vercel 会自动从 GitHub 克隆项目
4. **开始部署** - 点击 "Deploy" 按钮开始自动部署
5. **等待完成** - 通常 1-2 分钟即可完成部署
6. **访问网站** - 部署完成后会自动生成访问链接

#### 自定义域名(可选):

1. 在 Vercel 项目设置中点击 "Domains"
2. 添加您的自定义域名
3. 按照提示配置 DNS 记录
4. 等待 SSL 证书自动配置完成

### 本地运行

```bash
# 克隆项目
git clone https://github.com/truelife0958/music888.git

# 进入项目目录
cd music888

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

开发服务器启动后,访问 `http://localhost:5173`

## 📖 使用指南

### 搜索音乐
1. 在顶部搜索框输入歌曲名、歌手或专辑
2. 选择音乐平台(默认:网易云音乐)
3. 点击搜索按钮或按回车
4. 点击歌曲卡片开始播放

### 探索热门
1. 切换到"搜索结果"标签
2. 点击"探索雷达"按钮
3. 系统自动推荐热门歌曲

### 解析歌单
1. 切换到"解析网易云歌单"标签
2. 输入网易云歌单ID(如:`60198`)或完整链接
3. 点击"解析网易云歌单"按钮
4. 支持保存、下载整个歌单

### 管理收藏
1. 播放歌曲时,点击播放器下方的爱心按钮添加到"我的喜欢"
2. 在"我的歌单"标签查看所有收藏
3. 解析的歌单可保存到本地

## 🛠️ 技术栈

- **前端框架**: 原生 TypeScript + HTML5 + CSS3
- **构建工具**: Vite
- **音乐API**: [music-api.gdstudio.xyz](https://music-api.gdstudio.xyz)
- **UI图标**: Font Awesome
- **部署平台**: Vercel (支持)

## 📁 项目结构

```
music888/
├── api/                 # API 代理
│   └── proxy.js        # Vercel Serverless 函数
├── css/
│   └── style.css       # 样式文件
├── js/                 # TypeScript 源码
│   ├── api.ts          # API 调用封装
│   ├── main.ts         # 主程序入口
│   ├── player.ts       # 播放器逻辑
│   └── ui.ts           # UI 交互
├── index.html          # 主页面
├── package.json        # 项目配置
├── tsconfig.json       # TypeScript 配置
├── vercel.json         # Vercel 部署配置
└── README.md           # 项目说明
```

## 🔧 核心功能实现

### 品质自动降级机制
当请求的音乐品质不可用时,系统会自动按以下顺序尝试:
```
Hi-Res (999K) → 无损 FLAC (740K) → 高品质 (320K) → 较高 (192K) → 标准 (128K)
```

### 多格式歌单解析
支持4种API数据格式:
1. 直接歌曲数组: `[{song1}, {song2}, ...]`
2. 标准对象格式: `{ songs: [...], name: '...' }`
3. Data包装格式: `{ data: [...] }`
4. 网易云原始格式: `{ playlist: { tracks: [...] } }`

### 错误处理优化
- 详细的错误日志输出
- 用户友好的错误提示
- 自动重试机制
- 降级策略

## 🎯 设计原则

本项目严格遵循软件工程最佳实践:

- **KISS (Keep It Simple, Stupid)**: 简洁的代码和设计
- **DRY (Don't Repeat Yourself)**: 避免代码重复
- **YAGNI (You Aren't Gonna Need It)**: 只实现必要的功能
- **SOLID原则**: 单一职责、开闭原则等

## 🐛 已知问题

- 部分歌单可能因版权限制无法解析
- 某些音乐平台的API可能不稳定
- 建议使用公开的歌单ID进行测试(如:`60198`, `3778678`, `2884035`)

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request!

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: 添加某个功能'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 📄 开源协议

本项目采用 MIT 协议 - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

- [music-api.gdstudio.xyz](https://music-api.gdstudio.xyz) - 提供音乐API服务
- [Font Awesome](https://fontawesome.com/) - 提供图标库
- [Vite](https://vitejs.dev/) - 快速的构建工具

## 📧 联系方式

- GitHub: [@truelife0958](https://github.com/truelife0958)
- Issues: [提交问题](https://github.com/truelife0958/music888/issues)

---

⭐ 如果这个项目对您有帮助,请给个 Star 支持一下!
