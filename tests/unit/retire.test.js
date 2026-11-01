import { describe, expect, it } from 'vitest'
import { retireInfo, RETIRE_TRACKS } from '@/utils/retire'

describe('retire · 与官方对照表一致', () => {
  it('男职工:1965 年 1~4 月出生 → 60 岁 1 个月', () => {
    const r = retireInfo('1965-01', 'male')
    expect(r.ageYears).toBe(60)
    expect(r.ageMonths).toBe(1)
    expect(r.retireYm).toBe('2025-02')
  })

  it('男职工:1965 年 5 月出生 → 60 岁 2 个月', () => {
    const r = retireInfo('1965-05', 'male')
    expect(r.ageMonths).toBe(2)
  })

  it('男职工:1976 年 9 月及以后 → 63 岁整(封顶)', () => {
    expect(retireInfo('1976-09', 'male').ageYears).toBe(63)
    expect(retireInfo('1976-09', 'male').ageMonths).toBe(0)
    expect(retireInfo('1985-06', 'male').ageYears).toBe(63)
    expect(retireInfo('1985-06', 'male').delayMonths).toBe(36)
    expect(retireInfo('1999-12', 'male').ageYears).toBe(63)
  })

  it('女职工 55 档:1981 年 9 月及以后 → 58 岁整', () => {
    expect(retireInfo('1981-08', 'female55').ageMonths).toBe(11)
    expect(retireInfo('1981-09', 'female55').ageYears).toBe(58)
    expect(retireInfo('1990-01', 'female55').ageYears).toBe(58)
  })

  it('女职工 50 档:1984 年 11 月及以后 → 55 岁整', () => {
    expect(retireInfo('1984-10', 'female50').ageMonths).toBe(11)
    expect(retireInfo('1984-11', 'female50').ageYears).toBe(55)
    expect(retireInfo('1995-05', 'female50').ageYears).toBe(55)
  })

  it('改革前(过渡期起点之前)出生不受影响', () => {
    const r = retireInfo('1964-12', 'male')
    expect(r.before).toBe(true)
    expect(r.delayMonths).toBe(0)
    expect(r.ageYears).toBe(60)
    expect(r.retireYm).toBe('2024-12')
    // 弹性提前不得低于原法定:此时 earliest = 法定
    expect(r.earliestYm).toBe('2024-12')
  })

  it('过拟合抽查:女 50 档 1975 年 1~2 月 → 50 岁 1 个月', () => {
    const r = retireInfo('1975-01', 'female50')
    expect(r.ageYears).toBe(50)
    expect(r.ageMonths).toBe(1)
  })
})

describe('retire · 弹性区间', () => {
  it('提前 ≤3 年且不低于原法定;延后 ≤3 年', () => {
    const r = retireInfo('1985-06', 'male') // 63 岁,2048-06 退休;原 60 岁 → 2045-06
    expect(r.retireYm).toBe('2048-06')
    expect(r.originalYm).toBe('2045-06')
    expect(r.earliestYm).toBe('2045-06') // 2048-06 提前 3 年恰为原法定年龄
    expect(r.latestYm).toBe('2051-06')
  })

  it('延迟月数较多时,提前 3 年仍高于原法定年龄', () => {
    const r = retireInfo('1990-01', 'female50') // 已过过渡期,55 岁(延迟 60 个月)
    expect(r.delayMonths).toBe(60)
    expect(r.retireYm).toBe('2045-01')
    expect(r.originalYm).toBe('2040-01')
    expect(r.earliestYm).toBe('2042-01') // 2045-01 − 3 年,仍晚于原法定 2040-01
    expect(r.latestYm).toBe('2048-01')
  })
})

describe('retire · 入参校验', () => {
  it('非法年月与未知类别报可读错误', () => {
    expect(() => retireInfo('1985-13', 'male')).toThrow()
    expect(() => retireInfo('abc', 'male')).toThrow()
    expect(() => retireInfo('9999-06', 'male')).toThrow()
    expect(() => retireInfo('1985-06', 'unknown')).toThrow()
  })

  it('单数字月份也能解析', () => {
    expect(retireInfo('1985-6', 'male').retireYm).toBe('2048-06')
  })

  it('三档配置完整', () => {
    expect(RETIRE_TRACKS.map((t) => t.id)).toEqual(['male', 'female55', 'female50'])
    for (const t of RETIRE_TRACKS) expect(t.cap).toBeGreaterThan(t.base)
  })
})
