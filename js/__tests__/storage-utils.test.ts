// 使用 globals: true 时不需要导入
describe('存储工具测试', () => {
  beforeEach(() => {
    // 清空localStorage
    localStorage.clear();
  });

  describe('localStorage基础操作', () => {
    it('应该能够存储和读取数据', () => {
      localStorage.setItem('test', 'value');
      expect(localStorage.getItem('test')).toBe('value');
    });

    it('应该能够删除数据', () => {
      localStorage.setItem('test', 'value');
      localStorage.removeItem('test');
      expect(localStorage.getItem('test')).toBeNull();
    });

    it('应该能够清空所有数据', () => {
      localStorage.setItem('test1', 'value1');
      localStorage.setItem('test2', 'value2');
      localStorage.clear();
      expect(localStorage.length).toBe(0);
    });
  });

  describe('JSON数据存储', () => {
    it('应该能够存储对象', () => {
      const obj = { name: '测试', value: 123 };
      localStorage.setItem('obj', JSON.stringify(obj));
      const retrieved = JSON.parse(localStorage.getItem('obj') || '{}');
      expect(retrieved).toEqual(obj);
    });

    it('应该能够存储数组', () => {
      const arr = [1, 2, 3, 4, 5];
      localStorage.setItem('arr', JSON.stringify(arr));
      const retrieved = JSON.parse(localStorage.getItem('arr') || '[]');
      expect(retrieved).toEqual(arr);
    });
  });
});