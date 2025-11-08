// 使用 globals: true 时不需要导入
describe('基础测试', () => {
  it('应该能够执行基本断言', () => {
    expect(1 + 1).toBe(2);
  });

  it('应该能够测试字符串', () => {
    expect('hello').toBe('hello');
  });

  it('应该能够测试数组', () => {
    const arr = [1, 2, 3];
    expect(arr).toEqual([1, 2, 3]);
    expect(arr.length).toBe(3);
  });

  it('应该能够测试对象', () => {
    const obj = { name: 'test', value: 123 };
    expect(obj).toEqual({ name: 'test', value: 123 });
  });
});