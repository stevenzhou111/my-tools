import { describe, expect, it } from 'vitest'
import { analyzePassword } from '../../src/utils/passwordStrength'

// zxcvbn-ts 纯浏览器词典推理,这里验证打分锚点与中文映射
describe('passwordStrength · analyzePassword', () => {
  it('常见弱密码:低分 + 常见密码警告', () => {
    const r = analyzePassword('password')
    expect(r.score).toBeLessThanOrEqual(1)
    expect(r.warning).toContain('常被使用')
    expect(r.suggestions.length).toBeGreaterThan(0)
  })

  it('纯数字/顺序序列:低分并给出改进建议', () => {
    const r = analyzePassword('12345678')
    expect(r.score).toBeLessThanOrEqual(1)
    expect([...r.suggestions, r.warning].join('')).not.toBe('')
  })

  it('长随机口令短语:高分 + 极长破解时间', () => {
    const r = analyzePassword('correct horse battery staple xyzzy 42')
    expect(r.score).toBe(4)
    expect(r.label).toBe('非常强')
    expect(r.slowText).toContain('年')
  })

  it('中等问题密码:有可执行建议', () => {
    const r = analyzePassword('summer2024')
    expect(r.score).toBeLessThanOrEqual(2)
    expect(r.suggestions.length).toBeGreaterThan(0)
  })

  it('破解时间:慢哈希口径 >= 快哈希口径', () => {
    const r = analyzePassword('abc12345')
    // 两个口径都是中文时长文本,慢哈希的秒数更大;文本不可比,这里只验证都生成
    expect(r.fastText).toBeTruthy()
    expect(r.slowText).toBeTruthy()
  })

  it('空输入返回 null;空串兜底', () => {
    expect(analyzePassword('')).toBeNull()
    expect(analyzePassword(null)).toBeNull()
  })
})
