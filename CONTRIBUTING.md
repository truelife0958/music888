# 贡献指南

感谢您对云音乐播放器项目的关注！我们欢迎任何形式的贡献。

## 🤝 如何贡献

### 报告 Bug

如果您发现了 Bug，请：

1. 检查 [Issues](https://github.com/truelife0958/music888/issues) 确认问题是否已被报告
2. 如果没有，创建新的 Issue，包含：
   - 清晰的标题和描述
   - 复现步骤
   - 预期行为和实际行为
   - 截图或错误日志（如果适用）
   - 浏览器和操作系统信息

### 提出新功能

如果您有新功能建议：

1. 创建 Issue，标记为 `enhancement`
2. 详细描述功能需求和使用场景
3. 等待维护者反馈

### 提交代码

#### 1. Fork 和克隆

```bash
# Fork 仓库后克隆到本地
git clone https://github.com/YOUR_USERNAME/music888.git
cd music888

# 添加上游仓库
git remote add upstream https://github.com/truelife0958/music888.git
```

#### 2. 创建分支

```bash
# 从 main 分支创建新分支
git checkout -b feature/your-feature-name
# 或
git checkout -b fix/your-bug-fix
```

分支命名规范：
- `feature/xxx`: 新功能
- `fix/xxx`: Bug 修复
- `docs/xxx`: 文档更新
- `style/xxx`: 代码格式调整
- `refactor/xxx`: 代码重构
- `test/xxx`: 测试相关
- `chore/xxx`: 构建/工具相关

#### 3. 开发和测试

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 运行测试
npm test

# 类型检查
npm run type-check
```

#### 4. 提交代码

提交信息请遵循 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/) 规范：

```bash
# 格式
<type>(<scope>): <subject>

# 示例
git commit -m "feat(player): 添加播放速度控制"
git commit -m "fix(api): 修复网易云音乐源超时问题"
git commit -m "docs(readme): 更新安装说明"
```

**Type 类型：**
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式（不影响代码运行）
- `refactor`: 重构（既不是新增功能，也不是修复bug）
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

#### 5. 推送和创建 PR

```bash
# 推送到您的 Fork
git push origin feature/your-feature-name
```

然后在 GitHub 上创建 Pull Request：

1. 访问您的 Fork 仓库
2. 点击 "Compare & pull request"
3. 填写 PR 描述：
   - 说明改动内容
   - 关联相关 Issue（如 `Closes #123`）
   - 添加截图或 GIF（如果适用）
4. 等待代码审查

## 📋 代码规范

### TypeScript

- 使用 TypeScript 严格模式
- 所有函数和变量必须有类型注解
- 使用 `interface` 定义对象类型
- 使用 `type` 定义联合类型或复杂类型

```typescript
// ✅ 好的示例
interface Song {
    id: string;
    name: string;
    artist: string;
}

function playSong(song: Song): void {
    // ...
}

// ❌ 不好的示例
function playSong(song: any) {
    // ...
}
```

### 命名规范

- **变量/函数**: camelCase (`currentSong`, `playSong`)
- **类型/接口**: PascalCase (`Song`, `PlayerState`)
- **常量**: UPPER_SNAKE_CASE (`MAX_HISTORY_SIZE`)
- **文件名**: kebab-case (`music-player.ts`)

### 代码风格

- 使用 2 空格缩进
- 使用单引号 `'` 而不是双引号 `"`
- 每行最多 100 字符
- 函数最多 50 行
- 添加必要的注释

```typescript
/**
 * 播放指定歌曲
 * @param song 歌曲对象
 * @param autoPlay 是否自动播放
 * @returns Promise<void>
 */
async function playSong(song: Song, autoPlay: boolean = true): Promise<void> {
    // 实现...
}
```

### 错误处理

- 所有异步操作必须使用 try-catch
- 提供友好的错误提示
- 记录详细的错误日志

```typescript
try {
    const result = await api.fetchData();
} catch (error) {
    console.error('获取数据失败:', error);
    ui.showNotification('网络错误，请稍后重试', 'error');
}
```

## 🧪 测试要求

- 新功能必须包含单元测试
- Bug 修复应添加回归测试
- 测试覆盖率不低于 80%

```typescript
// tests/your-feature.test.ts
import { describe, it, expect } from 'vitest';
import { yourFunction } from '../js/your-module';

describe('YourFeature', () => {
    it('should work correctly', () => {
        const result = yourFunction('input');
        expect(result).toBe('expected');
    });
});
```

## 📝 文档要求

- 新功能需要更新 README.md
- 重大变更需要更新 CHANGELOG.md
- 复杂功能需要添加使用示例

## 🔍 代码审查

提交 PR 后，维护者会进行代码审查：

- 检查代码质量和规范
- 验证功能是否正常
- 确认测试覆盖率
- 提出改进建议

请及时响应审查意见，并进行必要的修改。

## 📜 许可证

提交代码即表示您同意将代码以 MIT 许可证发布。

## 💬 交流讨论

- **Issues**: 报告问题和功能建议
- **Discussions**: 一般性讨论和问答
- **Pull Requests**: 代码贡献

## 🙏 致谢

感谢所有贡献者的付出！您的贡献让这个项目变得更好。

---

**再次感谢您的贡献！** 🎉
