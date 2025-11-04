# Cloudflare Pages 部署指南

## 🚀 快速部署

### 方法一：通过Cloudflare Dashboard部署（推荐）

1. **Fork项目**
   - 访问 [GitHub仓库](https://github.com/truelife0958/music888)
   - 点击右上角 "Fork" 按钮，将项目Fork到你的账号

2. **登录Cloudflare**
   - 访问 [Cloudflare Pages](https://pages.cloudflare.com/)
   - 使用你的账号登录（没有账号请先注册）

3. **创建新项目**
   - 点击 "Create a project" 按钮
   - 选择 "Connect to Git"
   - 授权Cloudflare访问你的GitHub账号

4. **选择仓库**
   - 在仓库列表中找到 `music888`
   - 点击 "Begin setup"

5. **配置构建设置**
   ```
   项目名称: music888 (或自定义)
   生产分支: main
   框架预设: None
   构建命令: npm run build
   构建输出目录: dist
   ```

6. **开始部署**
   - 点击 "Save and Deploy"
   - 等待1-2分钟完成构建和部署
   - 部署完成后会自动生成域名：`your-project.pages.dev`

### 方法二：使用Wrangler CLI部署

1. **安装Wrangler**
   ```bash
   npm install -g wrangler
   ```

2. **登录Cloudflare**
   ```bash
   wrangler login
   ```

3. **构建项目**
   ```bash
   npm install
   npm run build
   ```

4. **部署到Cloudflare Pages**
   ```bash
   wrangler pages deploy dist --project-name=music888
   ```

## 🔧 配置说明

### 项目配置文件

**wrangler.toml** - Cloudflare Workers配置
```toml
name = "music888"
compatibility_date = "2024-01-01"

[build]
command = "npm run build"
cwd = "."
```

### API路由

项目使用Cloudflare Workers处理API请求：
- API路径: `/api`
- Workers函数: `functions/api.js`

### 环境变量

本项目无需配置环境变量，开箱即用。

## 🌐 自定义域名

### 添加自定义域名

1. 在Cloudflare Pages项目页面，进入 "Custom domains"
2. 点击 "Set up a custom domain"
3. 输入你的域名（例如：music.yourdomain.com）
4. 按照提示添加DNS记录
5. 等待SSL证书自动配置完成

### DNS配置示例

```
类型: CNAME
名称: music
内容: your-project.pages.dev
代理状态: 已代理（橙色云朵）
```

## 📊 部署优势

### Cloudflare Pages vs Vercel

| 特性 | Cloudflare Pages | Vercel |
|------|------------------|--------|
| 全球CDN | ✅ 275+节点 | ✅ |
| 构建速度 | ⚡ 快 | ⚡ 快 |
| 免费流量 | ♾️ 无限 | 100GB/月 |
| 免费构建 | 500次/月 | 100小时/月 |
| DDoS防护 | ✅ 内置 | ⚠️ 有限 |
| 边缘函数 | ✅ Workers | ✅ Edge |
| 价格 | 💰 免费 | 💰 免费 |

## 🔄 自动部署

### GitHub集成

- ✅ 推送到main分支自动部署
- ✅ Pull Request预览部署
- ✅ 构建状态通知
- ✅ 回滚到任意版本

### 部署历史

在Cloudflare Pages控制台可以：
- 查看所有部署历史
- 预览任意历史版本
- 一键回滚到之前的版本
- 查看构建日志

## 🛠️ 故障排查

### 构建失败

**问题**: 构建命令执行失败
```
解决方案:
1. 检查package.json中的build脚本
2. 确认Node.js版本兼容（推荐18+）
3. 在本地执行 npm run build 测试
```

**问题**: 找不到构建输出
```
解决方案:
1. 确认构建输出目录设置为 dist
2. 检查.gitignore是否排除了dist目录
3. 本地构建后检查dist目录是否生成
```

### API请求失败

**问题**: API返回404或500错误
```
解决方案:
1. 确认functions/api.js文件存在
2. 检查API路径是否为 /api
3. 查看Cloudflare Workers日志
```

### 部署后页面空白

**问题**: 部署成功但页面显示空白
```
解决方案:
1. 检查浏览器控制台错误
2. 确认index.html在dist根目录
3. 检查静态资源路径是否正确
```

## 📈 性能优化

### 缓存配置

Cloudflare自动优化：
- 静态资源CDN缓存
- 智能压缩（Brotli/Gzip）
- HTTP/3支持
- 图片优化

### Workers缓存

API响应已配置缓存：
```javascript
cf: {
    cacheTtl: 3600,  // 缓存1小时
    cacheEverything: true
}
```

## 🔒 安全性

### 默认安全特性

- ✅ 自动HTTPS（Let's Encrypt）
- ✅ DDoS防护
- ✅ WAF（Web应用防火墙）
- ✅ Bot管理
- ✅ Rate Limiting

## 📞 支持

### 官方资源

- [Cloudflare Pages文档](https://developers.cloudflare.com/pages/)
- [Cloudflare Workers文档](https://developers.cloudflare.com/workers/)
- [社区论坛](https://community.cloudflare.com/)

### 项目支持

- GitHub Issues: [提交问题](https://github.com/truelife0958/music888/issues)
- 在线演示: [https://music.weny888.com/](https://music.weny888.com/)

---

🎉 **恭喜！你已成功部署到Cloudflare Pages！**