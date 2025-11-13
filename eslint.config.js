import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

export default [
  // 全局忽略配置
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '*.config.js',
      '*.config.ts',
      'public/service-worker.js',
      'functions/**',
      'coverage/**',
      '.spec-workflow/**',
    ],
  },

  // JavaScript 基础配置
  js.configs.recommended,

  // TypeScript 配置
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
      },
      globals: {
        // 浏览器环境
        console: 'readonly',
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        location: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        Audio: 'readonly',
        MediaMetadata: 'readonly',
        Image: 'readonly',
        requestIdleCallback: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        IntersectionObserver: 'readonly',
        ResizeObserver: 'readonly',
        Worker: 'readonly',
        self: 'readonly',
        performance: 'readonly',
        getComputedStyle: 'readonly',
        confirm: 'readonly',
        alert: 'readonly',
        // 构建工具
        process: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      prettier: prettier,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...prettierConfig.rules,

      // Prettier 集成
      'prettier/prettier': 'warn',

      // TypeScript 规则
      '@typescript-eslint/no-explicit-any': 'off', // 暂时关闭，项目中合理使用any
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'none', // 忽略catch中未使用的error
        },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off', // 项目中有明确非空的场景
      '@typescript-eslint/no-this-alias': 'off', // 允许debounce/throttle中的this别名

      // 通用规则
      'no-console': 'off', // 已有Logger系统管理，暂时关闭
      'no-debugger': 'warn',
      'no-alert': 'off', // confirm/alert在用户确认场景是必要的
      'no-undef': 'error',
      'prefer-const': 'warn',
      'no-var': 'error',
      'no-empty': 'warn',
      'no-useless-catch': 'warn',
      'no-useless-escape': 'warn',
      'no-case-declarations': 'warn',
      'no-control-regex': 'off', // 输入验证中需要检测控制字符
      eqeqeq: ['error', 'always'],
    },
  },
];
