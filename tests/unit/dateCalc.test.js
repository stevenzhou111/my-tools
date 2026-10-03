import { describe, expect, it } from 'vitest'
import { addDays, addWorkdays, diffDays, formatDate, parseDate, weekdayName, workdaysBetween } from '@/utils/dateCalc'

const d = (s) => parseDate(s)

describe('parseDate', () => {
  it('只接受真实存在的日期', () => {
    expect(d('2026-02-28')).not.toBeNull()
    expect(d('2026-02-30')).toBeNull() // 2 月没有 30 号
    expect(d('2024-02-29')).not.toBeNull() // 闰年
    expect(d('2026-13-01')).toBeNull()
    expect(d('2026-1-1')).toBeNull() // 必须补零
    expect(d('hello')).toBeNull()
    expect(d('')).toBeNull()
  })
})

describe('diffDays', () => {
  it('同月、跨月、跨年都按日历日算', () => {
    expect(diffDays(d('2026-10-01'), d('2026-10-03'))).toBe(2)
    expect(diffDays(d('2026-09-30'), d('2026-10-02'))).toBe(2)
    expect(diffDays(d('2025-12-31'), d('2026-01-01'))).toBe(1)
    // 闰日:2024-02-28 → 2024-03-01 隔 2 天
    expect(diffDays(d('2024-02-28'), d('2024-03-01'))).toBe(2)
    expect(diffDays(d('2026-03-01'), d('2026-02-28'))).toBe(-1)
  })
})

describe('addDays', () => {
  it('跨月跨年正确进位', () => {
    expect(formatDate(addDays(d('2026-01-31'), 1))).toBe('2026-02-01')
    expect(formatDate(addDays(d('2026-12-31'), 1))).toBe('2027-01-01')
    expect(formatDate(addDays(d('2026-10-03'), -3))).toBe('2026-09-30')
  })
})

describe('addWorkdays', () => {
  it('跳过周六日', () => {
    // 2026-10-02 是周五 → +1 工作日 = 周一 10-05
    expect(weekdayName(d('2026-10-02'))).toBe('星期五')
    expect(formatDate(addWorkdays(d('2026-10-02'), 1))).toBe('2026-10-05')
    // 周五 +3 = 下周三
    expect(formatDate(addWorkdays(d('2026-10-02'), 3))).toBe('2026-10-07')
    // 周一往前 1 个工作日 = 上周五
    expect(formatDate(addWorkdays(d('2026-10-05'), -1))).toBe('2026-10-02')
  })

  it('起点是周末时不计入,从下一个工作日起算', () => {
    // 2026-10-03 是周六:+1 工作日 = 周一
    expect(weekdayName(d('2026-10-03'))).toBe('星期六')
    expect(formatDate(addWorkdays(d('2026-10-03'), 1))).toBe('2026-10-05')
  })

  it('n 为 0 时原样返回(即使当天是周末)', () => {
    expect(formatDate(addWorkdays(d('2026-10-03'), 0))).toBe('2026-10-03')
  })

  it('大跨度不出错(100 个工作日 ≈ 20 周后)', () => {
    const out = addWorkdays(d('2026-01-01'), 100)
    expect(out.getTime()).toBeGreaterThan(d('2026-01-01').getTime())
    expect(weekdayName(out)).not.toBe('星期六')
    expect(weekdayName(out)).not.toBe('星期日')
  })
})

describe('workdaysBetween', () => {
  it('含两端的工作日计数', () => {
    // 周一到周五:5 个工作日
    expect(workdaysBetween(d('2026-10-05'), d('2026-10-09'))).toBe(5)
    // 整周含周末:还是 5
    expect(workdaysBetween(d('2026-10-05'), d('2026-10-11'))).toBe(5)
    // 单个工作日 = 1;单个周末日 = 0
    expect(workdaysBetween(d('2026-10-05'), d('2026-10-05'))).toBe(1)
    expect(workdaysBetween(d('2026-10-03'), d('2026-10-04'))).toBe(0)
  })

  it('方向无关:反向区间与正向一致', () => {
    expect(workdaysBetween(d('2026-10-09'), d('2026-10-05'))).toBe(5)
  })
})