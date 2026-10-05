import { describe, expect, it } from 'vitest'
import { checkDigit, maskIdCard, parseIdCard } from '@/utils/idCard'

// 校验位基准由 node 按 GB 11643-1999 权重表现算
describe('idCard · 校验位', () => {
  it('经典样例 11010519491231002X', () => {
    expect(checkDigit('11010519491231002')).toBe('X')
    expect(parseIdCard('11010519491231002X').ok).toBe(true)
  })

  it('其他基准', () => {
    expect(checkDigit('44052418800101001')).toBe('4')
    expect(checkDigit('11010119900307751')).toBe('2')
    expect(checkDigit('11010120000101002')).toBe('9')
  })

  it('小写 x 自动转大写', () => {
    expect(parseIdCard('11010519491231002x').ok).toBe(true)
  })
})

describe('idCard · parseIdCard', () => {
  const id = '110101199003077512' // 北京 1990-03-07 男(第 17 位 1)

  it('解析省份 / 生日 / 性别 / 年龄', () => {
    const r = parseIdCard(id)
    expect(r.ok).toBe(true)
    expect(r.province).toBe('北京市')
    expect(r.birth).toBe('1990-03-07')
    expect(r.gender).toBe('男')
    expect(r.age).toBeGreaterThanOrEqual(36)
    expect(r.valid).toBe(true)
  })

  it('第 17 位偶数为女性', () => {
    const r = parseIdCard('110101200001010029')
    expect(r.ok).toBe(true)
    expect(r.gender).toBe('女')
    expect(r.sexCode).toBe('2')
  })

  it('格式错误 / 未知省份 / 无效日期 / 校验位不符', () => {
    expect(parseIdCard('123').error).toContain('18 位')
    expect(parseIdCard('990101199003077512').error).toContain('省级行政区')
    expect(parseIdCard('110101199013077512').error).toContain('出生日期')
    expect(parseIdCard('110101199003077519').error).toContain('校验位')
    const bad = parseIdCard('110101199003077519')
    expect(bad.valid).toBe(false)
  })

  it('未来日期拒绝', () => {
    const future = new Date()
    future.setFullYear(future.getFullYear() + 1)
    const ymd = `${future.getFullYear()}0101`
    const id17 = '110101' + ymd + '001'
    const full = id17 + checkDigit(id17)
    expect(parseIdCard(full).error).toContain('出生日期')
  })
})

describe('idCard · maskIdCard', () => {
  it('保留前 6 后 4', () => {
    expect(maskIdCard('110101199003077512')).toBe('110101********7512')
    expect(maskIdCard('11010519491231002x')).toBe('110105********002X')
    expect(maskIdCard('bad')).toBe(null)
  })
})
