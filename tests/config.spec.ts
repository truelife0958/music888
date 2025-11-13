import { test, expect, describe } from 'vitest';
import { PLAYER_CONFIG, API_CONFIG } from '../js/config';

describe('配置测试', () => {
  test('PLAYER_CONFIG 应该存在', () => {
    expect(PLAYER_CONFIG).toBeDefined();
  });

  test('API_CONFIG 应该存在', () => {
    expect(API_CONFIG).toBeDefined();
  });
});