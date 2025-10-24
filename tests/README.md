# 测试指南

本项目使用 [Vitest](https://vitest.dev/) 作为测试框架。

## 运行测试

```bash
# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 使用 UI 界面运行测试
npm run test:ui

# 监听模式（自动重新运行）
npm test -- --watch
```

## 测试结构

```
tests/
├── setup.ts           # 测试环境设置（模拟 API、localStorage 等）
├── utils.test.ts      # 工具函数测试
├── api.test.ts        # API 模块测试（待添加）
├── player.test.ts     # 播放器模块测试（待添加）
└── ui.test.ts         # UI 模块测试（待添加）
```

## 编写测试

### 基本示例

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '../js/myModule';

describe('MyModule', () => {
    it('should do something', () => {
        const result = myFunction('input');
        expect(result).toBe('expected output');
    });
});
```

### 异步测试

```typescript
it('should handle async operations', async () => {
    const result = await asyncFunction();
    expect(result).toBeDefined();
});
```

### 模拟函数

```typescript
import { vi } from 'vitest';

it('should call callback', () => {
    const callback = vi.fn();
    functionWithCallback(callback);
    expect(callback).toHaveBeenCalled();
});
```

## 测试覆盖率目标

- **语句覆盖率**: > 80%
- **分支覆盖率**: > 75%
- **函数覆盖率**: > 80%
- **行覆盖率**: > 80%

## 待添加的测试

### 1. API 模块测试 (`api.test.ts`)
- [ ] 搜索音乐 API
- [ ] 获取歌曲 URL
- [ ] 多音乐源切换
- [ ] 错误处理和重试

### 2. Player 模块测试 (`player.test.ts`)
- [ ] 播放/暂停功能
- [ ] 上一曲/下一曲
- [ ] 播放模式切换
- [ ] 播放历史记录
- [ ] 收藏功能

### 3. UI 模块测试 (`ui.test.ts`)
- [ ] 通知显示
- [ ] 加载状态
- [ ] 歌词更新
- [ ] 搜索结果渲染

## 最佳实践

1. **测试命名**: 使用清晰的描述性名称
2. **独立性**: 每个测试应该独立运行
3. **清理**: 使用 `beforeEach` 和 `afterEach` 清理状态
4. **边界情况**: 测试边界值和异常情况
5. **可读性**: 保持测试代码简洁易读

## 持续集成

测试可以集成到 CI/CD 流程中：

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
```

## 参考资源

- [Vitest 文档](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Jest 文档](https://jestjs.io/) (Vitest 兼容 Jest API)
