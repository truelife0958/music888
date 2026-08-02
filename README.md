# 沄听 - 在线音乐播放器

功能丰富的在线音乐播放器，三栏布局设计，集成歌手浏览、电台播客、歌单管理等功能。
<img width="1912" height="930" alt="screencapture-music888-pages-dev-2026-02-06-22_08_25" src="https://github.com/user-attachments/assets/a3f468f5-24c2-4828-a13b-6e0c9daec95d" />

## 功能介绍

### 三栏布局

| 搜索 / 排行榜 / 歌手 / 电台 | 封面 / 控制 / 单行歌词 / 进度 | 歌单 / 收藏 / 历史 / 歌词 |
|:---:|:---:|:---:|
| 搜索 / 排行榜 / 歌手 / 电台 | 封面 / 控制 / 单行歌词 / 进度 | 歌单 / 收藏 / 播放历史 |

### 搜索与发现

- **综合搜索** — 输入关键词即搜，支持歌名、歌手、专辑
- **探索雷达** — 一键换一批热门推荐
- **排行榜** — 热歌榜 / 新歌榜 / 飙升榜

### 歌手浏览

- **三维筛选** — 地区（华语/欧美/日本/韩国）+ 分类（男歌手/女歌手/乐队组合）+ 首字母（A-Z）
- **组合过滤** — 多维度自由组合，如"华语 + 女歌手 + J"
- **歌手卡片** — 头像网格展示，点击进入歌手主页
- **全部歌曲** — 查看歌手全部歌曲（按热度排序），支持分页加载
- **详情头部** — 显示歌手头像、歌曲总数、专辑数
- **分页加载** — 每次加载 50 首，点击"加载更多"继续

### 电台播客

- **分类筛选** — 自动获取电台分类列表，按分类浏览电台
- **热门电台** — 浏览热门电台节目
- **节目列表** — 进入电台查看节目详情
- **一键播放** — 点击节目直接播放音频
- **分页加载** — 滚动到底自动加载更多

### 播放器

- **品质选择** — 标准 128K / 较高 192K / 高品质 320K / 无损 FLAC / Hi-Res
- **品质自动降级** — 高品质不可用时自动回退
- **跨源搜索** — VIP 歌曲自动从其他源查找完整版
- **试听检测** — 自动检测试听片段并无缝切换完整版
- **播放模式** — 列表循环 / 随机播放 / 单曲循环
- **单行歌词** — 播放器区域实时显示当前歌词行
- **音频淡入淡出** — 切歌时平滑过渡
- **Media Session** — 支持系统级媒体控制（锁屏、媒体键）
- **键盘快捷键** — 空格播放/暂停，方向键切歌/调音量

### 歌单与收藏（右栏"我的"）

- **用户歌单** — 输入网易云用户 ID，加载公开歌单列表
- **电台订阅** — 输入电台 ID 添加收藏，持久化保存
- **歌单解析** — 输入网易云歌单 ID 或链接，解析歌曲列表
- **合并展示** — 用户歌单与订阅电台合并显示，一键切换
- **批量操作** — 播放全部搜索结果
- **我的收藏** — 收藏喜欢的歌曲，持久化到本地
- **播放历史** — 自动记录最近 50 首，支持一键清空
- **歌曲下载** — 下载高品质音乐和 LRC 歌词文件
- **自动恢复** — 刷新页面自动恢复已保存的用户 ID 和电台

### 歌词体验

- **歌词面板** — 右栏新增"歌词"页签，随播放同步展示完整歌词
- **平滑滚动居中** — 当前行始终居中且滚动平滑，不打乱整页布局
- **高亮动效** — 当前行会放大、渐变背景、入场淡入动画
- **时间戳展示** — 当前行前显示 mm:ss 时间戳，准确定位
- **字体大小调节** — A+/A- 按钮调整歌词字号，本地持久化记住偏好
- **双语歌词** — 原词下方以较小字体显示翻译歌词
- **单行歌词** — 播放器栏仍保留单行实时歌词

### 安全与引导

- **Cloudflare Turnstile** — 首次访问人机验证，API 代理双重校验
- **引导弹窗** — 首次使用展示免责声明与功能简介
- **服务端审计验证** — 配置 `TURNSTILE_SECRET_KEY` 后，代理会记录 token 验证结果，不因一次性 token 复用误伤播放

### 移动端适配

- **三页滑动** — 搜索页 → 播放器页 → 我的页
- **触摸手势** — 左右滑动切换页面
- **响应式网格** — 歌手卡片自动适配为 2 列/3 列
- **平板适配** — 针对 ≤1200px 平板设备优化布局
- **PWA 支持** — 可添加到主屏幕作为独立应用

## 技术栈

| 类别 | 技术 |
|------|------|
| 语言 | TypeScript |
| 构建 | Vite |
| 测试 | Vitest + jsdom |
| 浏览器验收 | Playwright + Chromium UI Audit |
| 代码检查 | ESLint + Prettier |
| 部署 | Cloudflare Pages + Functions |
| 图标 | Font Awesome 6 |

## 项目结构

```
music888/
├── functions/
│   └── api/proxy.js        # Cloudflare Pages Function（CORS 代理）
├── css/
│   ├── base.css             # 基础重置
│   ├── variables.css        # CSS 变量 / 主题
│   ├── layout.css           # 三栏布局
│   ├── components.css       # 通用组件（歌手卡片/电台列表/筛选栏/标签页）
│   ├── player.css           # 播放器
│   ├── lyrics.css           # 歌词 + 单行歌词
│   ├── animations.css       # 动画
│   ├── mobile.css           # 移动端适配
│   └── style.css            # 样式入口
├── js/
│   ├── api/
│   │   ├── client.ts        # HTTP 客户端（fetchWithRetry / 代理）
│   │   ├── music.ts         # 歌曲 URL / 歌词 / 封面 / 跨源搜索
│   │   ├── search.ts        # 搜索 / 歌单 / 歌手列表 / 电台 / 电台分类
│   │   ├── sources.ts       # API 源配置与检测
│   │   └── utils.ts         # 相似度计算 / 源统计
│   ├── player/
│   │   ├── core.ts          # 播放器核心状态
│   │   ├── control.ts       # 播放控制（播放/暂停/切歌）
│   │   ├── effects.ts       # 音频淡入淡出
│   │   ├── events.ts        # 音频事件 / Media Session / 试听检测
│   │   └── lyrics.ts        # 歌词解析
│   ├── api.ts               # API 统一导出
│   ├── config.ts            # 配置常量
│   ├── main.ts              # 入口（事件绑定/标签切换/手势/筛选器）
│   ├── player.ts            # 播放器统一导出
│   ├── types.ts             # TypeScript 类型定义
│   ├── ui.ts                # UI 渲染（歌手网格/电台列表/歌词/通知）
│   └── utils.ts             # 工具函数
├── public/
│   ├── manifest.json        # PWA 清单
│   └── sw.js                # Service Worker
├── index.html               # 主页面
├── dev-proxy-plugin.ts      # Vite dev 服务器代理插件（开发环境转发 /api/proxy）
├── wrangler.toml             # Cloudflare Pages 配置
├── vite.config.ts
└── package.json
```

## 部署指南

### Cloudflare Pages 部署（当前方案）

本项目使用 Cloudflare Pages + Functions 部署，代理函数处理 CORS 跨域请求。

#### 方式一：Git 集成（推荐）

1. Fork 本仓库到你的 GitHub 账号
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/) → Workers & Pages
3. 点击 **Create application** → **Pages** → **Connect to Git**
4. 选择你 Fork 的仓库，配置如下：

   | 配置项 | 值 |
   |--------|-----|
   | Framework preset | None |
   | Build command | `npm run build` |
   | Build output directory | `dist` |

5. 点击 **Save and Deploy**，等待构建完成

每次推送到 `main` 分支将自动触发部署。

#### 方式二：Wrangler CLI

```bash
# 安装 Wrangler
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 构建项目
npm run build

# 部署
wrangler pages deploy dist --project-name music888
```

#### 环境变量（可选）

在 Cloudflare Pages Dashboard → Settings → Environment Variables 中配置：

| 变量名 | 说明 |
|--------|------|
| `NETEASE_VIP_COOKIE` | 网易云 VIP Cookie，用于解锁 VIP 歌曲 |
| `EXTRA_ALLOWED_HOSTS` | 额外允许代理的域名（逗号分隔） |
| `VITE_TURNSTILE_SITE_KEY` | Cloudflare Turnstile 站点密钥（构建时注入前端） |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile 服务端密钥（运行时审计验证） |

获取步骤：1. 登录控制台：登录 Cloudflare 账户，进入 "Turnstile" 选项卡。
2. 创建小部件：点击添加站点，填写域名（支持域名白名单）并选择小部件类型。
3. 获取密钥：点击 "Manage widget"，即可复制生成的站点密钥 Site key（用于前端渲染）和 服务端密钥Secret key（用于后端验证）。
#### 自定义域名

1. Pages Dashboard → Custom domains
2. 添加域名（如 `music.yourdomain.com`）
3. 按提示配置 DNS CNAME 记录
4. SSL 证书自动签发

### 其他部署方式

#### Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/truelife0958/music888)

需要将 `functions/api/proxy.js` 适配为 Vercel Serverless Function 格式。

#### Docker

```bash
# 构建
docker build -t music888 .

# 运行
docker run -d -p 80:80 music888
```

> 更多部署方式（Netlify、GitHub Pages、Nginx、Docker）详见 [DEPLOYMENT.md](./DEPLOYMENT.md)

### 本地开发

```bash
# 克隆
git clone https://github.com/truelife0958/music888.git
cd music888

# 安装依赖
npm install

# 启动开发服务器（http://localhost:5173）
npm run dev

# 构建
npm run build

# 测试
npm run test:run

# 真实浏览器 UI 巡检（生成 test-results/ui-audit）
npm run audit:ui

# 新版 Linux 发行版若 Playwright 无法自动安装浏览器，可指定已有 Chromium
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/path/to/chrome npm run test:e2e:run

# 系统已具备 Chromium 依赖时，可关闭仓库内的兼容库注入
PLAYWRIGHT_USE_LOCAL_LIBS=0 PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/path/to/chrome npm run test:e2e:run

## API 架构

```
音乐源优先级（运行时按健康动态选择）：
1. GDStudio API          → 多源聚合搜索（netease/joox/kuwo/bilibili）
2. NEC Enhanced 镜像群  → 网易云官方 match/Song/lyric/playlist 等接口
   ┊   neteaseapi.gksm.store  →  www.megumi-ben.cn  →  www.fish6.icu
   └→ music888.zeabur.app  →  w7z.indevs.in  （末两个仅作兑底，不稳定）
3. Meting API           → 备用接口（搜索/封面/歌单）
4. 跨源搜索              → joox/kuwo/bilibili 竞速回退，解 VIP/试听版
```

项目在启动时对所有镜像倾以纯净探测（顺序，首个可用即选中），运行时仅使用选中的镜像；
选中镜像连续失败后自动顺延到下一个（`setActiveNecBase`/`getActiveNecBaseUrl`）。`FALLBACK_SOURCES 中含 ['joox','kuwo','bilibili']，数据驱动地决定 cross-source 搜索与试听回退。

代理层（`functions/api/proxy.js`）提供 URL 白名单校验与 CORS 头注入，所有外部请求经由代理中转；
开发环境下由 `dev-proxy-plugin.ts` 在 Vite dev server 上转发同名路径。
## 安全措施

- **Turnstile 验证** — 前端人机挑战 + 后端 token 审计记录
- **XSS 防护** — `escapeHtml()` + `textContent` 防止注入
- **SSRF 防护** — 代理服务 URL 白名单 + 协议检查
- **CSP 策略** — Content-Security-Policy 限制资源加载来源
- **输入校验** — `encodeURIComponent` + 正则验证
- **错误隔离** — 用户消息与内部错误分离

## 常见问题

**VIP 歌曲只播放试听版?**
> 在部署环境配置 `NETEASE_VIP_COOKIE` 环境变量。

**歌曲无法播放?**
> 可能因版权限制，系统会自动尝试从其他平台搜索完整版。

**歌单解析失败?**
> 确保输入公开歌单 ID 或链接。测试歌单：`60198`、`3778678`。

**数据保存在哪?**
> 收藏、历史、歌单均保存在浏览器 localStorage，不上传服务器。

## 开源协议

MIT License

## 致谢

- [NeteaseCloudMusicApi Enhanced](https://github.com/neteasecloudmusicapiapienhanced/api-enhanced) — 网易云 API 增强版（主力音乐源）
- [music-api.gdstudio.xyz](https://music-api.gdstudio.xyz) — GDStudio 多源聚合音乐 API（备用接口）
- [api.injahow.cn/meting](https://api.injahow.cn/meting/) — Meting API（备用接口）
- [Font Awesome](https://fontawesome.com/) — 图标库
- [Vite](https://vitejs.dev/) — 构建工具
