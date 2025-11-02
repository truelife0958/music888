// NeteaseCloudMusic API Enhanced - Simplified Entry Point
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// 导入 NeteaseCloudMusicApi 所有接口
const api = require('@neteasecloudmusicapienhanced/api');

// 导入 Meting API 适配层
const metingAdapter = require('./meting-adapter');

// CORS配置
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.CORS_ALLOW_ORIGIN || '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// JSON解析
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 健康检查
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'NeteaseCloudMusic API Enhanced is running',
    version: '1.0.0',
    endpoints: {
      ncm: '/:module - 原始NCM API接口',
      meting: '/api.php - Meting兼容接口'
    }
  });
});

// Meting API 兼容路由 - 支持多个路径
const metingHandler = async (req, res) => {
  const { types, type, server = 'netease', id, name, count, br, size } = { ...req.query, ...req.body };

  // 支持 types 和 type 两种参数名
  const actionType = types || type;

  if (!actionType) {
    return res.status(400).json({
      code: 400,
      message: '缺少 type 或 types 参数'
    });
  }

  try {
    let result;

    switch (actionType) {
      case 'search':
        result = await metingAdapter.search({ name, count });
        break;

      case 'url':
        result = await metingAdapter.url({ id, br });
        break;

      case 'pic':
        result = await metingAdapter.pic({ id, size });
        break;

      case 'lrc':
      case 'lyric':
        result = await metingAdapter.lyric({ id });
        break;

      case 'playlist':
        result = await metingAdapter.playlist({ id });
        break;

      case 'song':
        result = await metingAdapter.song({ id });
        break;

      default:
        return res.status(400).json({
          code: 400,
          message: `不支持的类型: ${actionType}`
        });
    }

    res.json(result);
  } catch (error) {
    console.error(`Meting API Error [${actionType}]:`, error);
    res.status(500).json({
      code: 500,
      message: error.message || '服务器错误'
    });
  }
};

// 注册多个Meting API路由
app.all('/api.php', metingHandler);
app.all('/api/meting', metingHandler);  // 🔧 添加 /api/meting 路由支持

// 动态路由：将所有请求映射到对应的API函数
app.all('/:module', async (req, res) => {
  const module = req.params.module;

  // 检查API模块是否存在
  if (!api[module]) {
    return res.status(404).json({
      code: 404,
      message: `接口 ${module} 不存在`
    });
  }

  try {
    // 合并GET和POST参数
    const params = { ...req.query, ...req.body };

    // 调用对应的API函数
    const result = await api[module](params);

    // 返回结果
    res.json(result.body || result);
  } catch (error) {
    console.error(`API Error [${module}]:`, error);
    res.status(500).json({
      code: 500,
      message: error.message || '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// 启动服务器
app.listen(port, () => {
  console.log(`🎵 NeteaseCloudMusic API Enhanced running at http://localhost:${port}`);
  console.log(`📚 API Docs: https://neteasecloudmusicapienhanced.js.org/`);
});

module.exports = app;
