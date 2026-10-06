import { describe, expect, it } from 'vitest'
import { leapMonth, lunarToSolar, solarToLunar } from '@/utils/lunar'

const fmt = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const parse = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// 锚点为公开的历年春节(正月初一)日期
describe('lunar · 春节锚点', () => {
  const CHUNJIE = [
    ['2017-01-28', 2017], ['2018-02-16', 2018], ['2019-02-05', 2019],
    ['2020-01-25', 2020], ['2021-02-12', 2021], ['2022-02-01', 2022],
    ['2023-01-22', 2023], ['2024-02-10', 2024], ['2025-01-29', 2025],
    ['2026-02-17', 2026],
  ]
  it.each(CHUNJIE)('%s 是 %d 年正月初一', (iso, year) => {
    const l = solarToLunar(parse(iso))
    expect(l.year).toBe(year)
    expect(l.month).toBe(1)
    expect(l.day).toBe(1)
    expect(l.isLeap).toBe(false)
  })
})

describe('lunar · 闰月事实', () => {
  it('2020 闰四月、2023 闰二月、2025 闰六月、2022/2024/2026 无闰', () => {
    expect(leapMonth(2020)).toBe(4)
    expect(leapMonth(2023)).toBe(2)
    expect(leapMonth(2025)).toBe(6)
    expect(leapMonth(2022)).toBe(0)
    expect(leapMonth(2024)).toBe(0)
    expect(leapMonth(2026)).toBe(0)
  })

  it('闰月日期正确标记 isLeap(2025 闰六月初一 = 2025-07-25)', () => {
    const l = solarToLunar(parse('2025-07-25'))
    expect(l.isLeap).toBe(true)
    expect(l.month).toBe(6)
    expect(l.day).toBe(1)
    expect(l.monthName).toBe('闰六月')
  })
})

describe('lunar · 文本与干支', () => {
  it('2026-10-07 为丙午马年八月廿七', () => {
    const l = solarToLunar(parse('2026-10-07'))
    expect(l.text).toBe('丙午马年八月廿七')
    expect(l.ganzhi).toBe('丙午')
    expect(l.zodiac).toBe('马')
  })

  it('2024-02-10 文本(甲辰龙年正月初一)', () => {
    expect(solarToLunar(parse('2024-02-10')).text).toBe('甲辰龙年正月初一')
  })

  it('腊月与三十', () => {
    // 2023-01-20 是壬寅年腊月廿九(2023 无年三十)
    const l = solarToLunar(parse('2023-01-20'))
    expect(l.monthName).toBe('腊月')
    expect(l.dayName).toBe('廿九')
  })
})

describe('lunar · 农历转公历与往返', () => {
  it('春节锚点反向', () => {
    expect(fmt(lunarToSolar({ year: 2026, month: 1, day: 1 }))).toBe('2026-02-17')
    expect(fmt(lunarToSolar({ year: 2024, month: 1, day: 1 }))).toBe('2024-02-10')
  })

  it('闰月反向', () => {
    expect(fmt(lunarToSolar({ year: 2025, month: 6, day: 1, isLeap: true }))).toBe('2025-07-25')
  })

  it('非法输入返回 null', () => {
    expect(lunarToSolar({ year: 2025, month: 5, day: 1, isLeap: true })).toBe(null) // 2025 闰六月
    expect(lunarToSolar({ year: 2025, month: 6, day: 31, isLeap: true })).toBe(null) // 闰六月 29 天
    expect(lunarToSolar({ year: 2025, month: 13, day: 1 })).toBe(null)
    expect(lunarToSolar({ year: 1899, month: 1, day: 1 })).toBe(null)
  })

  it('2020/2024/2025 全年逐日往返一致', () => {
    for (const y of [2020, 2024, 2025]) {
      const d = parse(`${y}-01-01`)
      const end = parse(`${y}-12-31`)
      for (; d <= end; d.setDate(d.getDate() + 1)) {
        const l = solarToLunar(d)
        expect(fmt(lunarToSolar({ year: l.year, month: l.month, day: l.day, isLeap: l.isLeap }))).toBe(fmt(d))
      }
    }
  })

  it('范围之外返回 null', () => {
    expect(solarToLunar(parse('1899-12-31'))).toBe(null)
    expect(solarToLunar(parse('2101-01-01'))).toBe(null)
  })
})
