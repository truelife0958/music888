# 🚀 部署指南

本文档详细说明如何将网易云音乐API增强版部署到各种平台。

## 📋 目录

- [Vercel 部署](#vercel-部署)
- [Docker 部署](#docker-部署)
- [传统服务器部署](#传统服务器部署)
- [Nginx 配置](#nginx-配置)
- [性能优化建议](#性能优化建议)

## 🌐 Vercel 部署

### 方式一：通过Vercel Dashboard

1. **准备工作**
   - 注册 [Vercel](https://vercel.com) 账号
   - 将项目推送到 GitHub/GitLab/Bitbucket

2. **导入项目**
   ```
   1. 访问 Vercel Dashboard
   2. 点击 "New Project"
   3. 选择你的仓库
   4. 点击 "Import"
   ```

3. **配置环境变量**（可选）
   ```
   NODE_ENV=production
   CACHE_TTL=300000
   RATE_LIMIT=100
   ALLOWED_ORIGINS=*
   ```

4. **部署**
   - Vercel 自动检测配置
   - 点击 "Deploy"
   - 等待部署完成

5. **获取URL**
   ```
   你的API地址：https://your-project.vercel.app
   测试接口：https://your-project.vercel.app/api/ncm-proxy
   ```

### 方式二：通过Vercel CLI

```bash
# 安装Vercel CLI
npm install -g vercel

# 登录
vercel login

# 部署
vercel

# 生产环境部署
vercel --prod
```

### Vercel配置说明

项目已包含 `vercel.json` 配置文件：

```json
{
  "functions": {
    "api/*.js": {
      "memory": 1024,
      "maxDuration": 10
    }
  }
}
```

**配置项说明**：
- `memory`: 函数内存限制（MB）
- `maxDuration`: 最大执行时间（秒）

## 🐳 Docker 部署

### 创建 Dockerfile

在 `ncm-api` 目录创建 `Dockerfile`：

```dockerfile
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm install --production

# 复制应用文件
COPY . .

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 启动应用
CMD ["node", "enhanced-app.js"]
```

### 构建和运行

```bash
# 构建镜像
docker build -t ncm-api:latest .

# 运行容器
docker run -d \
  --name ncm-api \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e CACHE_TTL=300000 \
  -e RATE_LIMIT=100 \
  --restart unless-stopped \
  ncm-api:latest

# 查看日志
docker logs -f ncm-api

# 停止容器
docker stop ncm-api

# 删除容器
docker rm ncm-api
```

### Docker Compose 部署

创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  ncm-api:
    build: .
    container_name: ncm-api
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - CACHE_TTL=300000
      - RATE_LIMIT=100
      - ALLOWED_ORIGINS=*
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 3s
      retries: 3
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

使用 Docker Compose：

```bash
# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 重新构建并启动
docker-compose up -d --build
```

## 🖥️ 传统服务器部署

### 使用 PM2（推荐）

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start enhanced-app.js --name ncm-api

# 查看状态
pm2 status

# 查看日志
pm2 logs ncm-api

# 重启应用
pm2 restart ncm-api

# 停止应用
pm2 stop ncm-api

# 删除应用
pm2 delete ncm-api
```

### PM2 配置文件

创建 `ecosystem.config.js`：

```javascript
module.exports = {
  apps: [{
    name: 'ncm-api',
    script: './enhanced-app.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      CACHE_TTL: 300000,
      RATE_LIMIT: 100
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    max_memory_restart: '500M',
    watch: false,
    autorestart: true
  }]
};
```

使用配置文件启动：

```bash
pm2 start ecosystem.config.js
```

### 设置开机自启

```bash
# 生成启动脚本
pm2 startup

# 保存当前进程列表
pm2 save

# 查看启动脚本
pm2 startup -u $USER
```

### 使用 Systemd

创建 `/etc/systemd/system/ncm-api.service`：

```ini
[Unit]
Description=NeteaseCloudMusic API Enhanced
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/ncm-api
Environment="NODE_ENV=production"
Environment="PORT=3000"
ExecStart=/usr/bin/node enhanced-app.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

启用服务：

```bash
# 重新加载systemd
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start ncm-api

# 设置开机自启
sudo systemctl enable ncm-api

# 查看状态
sudo systemctl status ncm-api

# 查看日志
sudo journalctl -u ncm-api -f
```

## 🔧 Nginx 配置

### 基础反向代理

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 带缓存的配置

```nginx
# 缓存配置
proxy_cache_path /var/cache/nginx/ncm-api levels=1:2 keys_zone=ncm_cache:10m max_size=1g inactive=60m use_temp_path=off;

server {
    listen 80;
    server_name api.yourdomain.com;

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # 缓存配置
        proxy_cache ncm_cache;
        proxy_cache_valid 200 5m;
        proxy_cache_key $scheme$proxy_host$request_uri;
        add_header X-Cache-Status $upstream_cache_status;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

### HTTPS 配置

```nginx
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# HTTP 重定向到 HTTPS
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

## ⚡ 性能优化建议

### 1. 应用层优化

**增加缓存时间**：
```javascript
// enhanced-app.js
const CACHE_TTL = 10 * 60 * 1000; // 改为10分钟
```

**增加缓存大小**：
```javascript
// 设置缓存
setCache(key, data);

// 限制缓存大小
if (cache.size > 2000) { // 改为2000
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
}
```

**启用集群模式**（PM2）：
```javascript
// ecosystem.config.js
{
  instances: 'max', // 使用所有CPU核心
  exec_mode: 'cluster'
}
```

### 2. 服务器优化

**增加文件描述符限制**：
```bash
# /etc/security/limits.conf
* soft nofile 65536
* hard nofile 65536
```

**优化系统参数**：
```bash
# /etc/sysctl.conf
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 8192
net.ipv4.ip_local_port_range = 1024 65535
```

### 3. 数据库优化（如使用Redis）

安装Redis用于分布式缓存：

```bash
# 安装Redis
sudo apt install redis-server

# 启动Redis
sudo systemctl start redis
```

修改代码使用Redis：
```javascript
const redis = require('redis');
const client = redis.createClient();

async function getCache(key) {
  return await client.get(key);
}

async function setCache(key, data, ttl = 300) {
  await client.setEx(key, ttl, JSON.stringify(data));
}
```

### 4. CDN 加速

使用Cloudflare CDN：
1. 添加域名到Cloudflare
2. 配置DNS记录
3. 启用缓存规则
4. 设置缓存时间

## 📊 监控和日志

### PM2 监控

```bash
# 实时监控
pm2 monit

# Web监控
pm2 web
```

### 日志管理

```bash
# PM2日志
pm2 logs ncm-api --lines 100

# 清理日志
pm2 flush

# Docker日志
docker logs -f ncm-api --tail 100
```

### 健康检查脚本

创建 `health-check.sh`：

```bash
#!/bin/bash

API_URL="http://localhost:3000/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $API_URL)

if [ $RESPONSE -eq 200 ]; then
    echo "✅ API is healthy"
    exit 0
else
    echo "❌ API is down (HTTP $RESPONSE)"
    exit 1
fi
```

添加到crontab：
```bash
# 每5分钟检查一次
*/5 * * * * /path/to/health-check.sh
```

## 🔒 安全建议

1. **使用HTTPS**：配置SSL证书
2. **限制CORS**：设置允许的域名
3. **请求限流**：防止DDoS攻击
4. **隐藏版本信息**：不暴露技术栈
5. **定期更新**：保持依赖包最新

## 📝 故障排查

### 常见问题

**问题1：端口被占用**
```bash
# 查找占用端口的进程
lsof -i :3000

# 杀死进程
kill -9 <PID>
```

**问题2：权限不足**
```bash
# 给予执行权限
chmod +x enhanced-app.js

# 使用正确的用户运行
sudo -u www-data node enhanced-app.js
```

**问题3：内存不足**
```bash
# 查看内存使用
pm2 monit

# 限制内存
pm2 start enhanced-app.js --max-memory-restart 500M
```

## 📚 参考资源

- [Vercel 文档](https://vercel.com/docs)
- [Docker 文档](https://docs.docker.com/)
- [PM2 文档](https://pm2.keymetrics.io/)
- [Nginx 文档](https://nginx.org/en/docs/)

---

**祝部署顺利！如有问题请提交 Issue。**
