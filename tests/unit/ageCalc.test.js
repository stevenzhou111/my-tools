import { describe, expect, it } from 'vitest'
import { ageInfo } from '@/utils/ageCalc'

describe('ageCalc · 周岁', () => {
  it('生日已过:周岁 = 年差', () => {
    // 1995-06-15 → 2026-01-10:生日未到,30 岁差 1
    expect(ageInfo('1995-06-15', '2026-01-10').data.ageYears).toBe(30)
  })

  it('生日未过:周岁 = 年差 − 1', () => {
    expect(ageInfo('1995-06-15', '2026-08-10').data.ageYears).toBe(31)
    expect(ageInfo('1995-06-15', '2026-06-15').data.ageYears).toBe(31) // 当天算已过
    expect(ageInfo('1995-06-15', '2026-06-14').data.ageYears).toBe(30)
  })

  it('2 月 29 日出生:平年在 3 月 1 日才算生日已过', () => {
    expect(ageInfo('2000-02-29', '2026-02-28').data.ageYears).toBe(25)
    expect(ageInfo('2000-02-29', '2026-03-01').data.ageYears).toBe(26)
    // 闰年当年 2/29 当天已满
    expect(ageInfo('2000-02-29', '2028-02-29').data.birthdayToday).toBe(true)
  })
})

describe('ageCalc · 虚岁与生肖', () => {
  it('虚岁按农历年差 + 1(基准日未过春节仍属上一农历年)', () => {
    const r = ageInfo('1995-06-15', '2026-01-10')
    // 2026 春节在 2 月,1 月 10 日农历仍是乙巳年 → 2025 − 1995 + 1 = 31
    expect(r.data.xusui).toBe(31)
  })

  it('春节前出生生肖属上一年(按农历表)', () => {
    // 2024-02-05:2024 春节是 2/10,此前出生仍属兔
    expect(ageInfo('2024-02-05', '2026-01-10').data.zodiac).toBe('兔')
    // 2024-02-11 起属龙
    expect(ageInfo('2024-02-11', '2026-01-10').data.zodiac).toBe('龙')
  })

  it('干支与星座', () => {
    const r = ageInfo('1995-06-15', '2026-01-10')
    expect(r.data.ganzhi).toBe('乙亥') // 1995 乙亥猪年
    expect(r.data.zodiac).toBe('猪')
    expect(r.data.constellation).toBe('双子座')
    expect(ageInfo('1995-12-25', '2026-01-10').data.constellation).toBe('摩羯座')
  })
})

describe('ageCalc · 累计与倒计时', () => {
  it('生活天数与月数', () => {
    const r = ageInfo('2024-01-15', '2026-01-15')
    expect(r.data.totalMonths).toBe(24)
    expect(r.data.totalDays).toBe(731) // 2024 闰年 366 + 365
  })

  it('下一个生日倒计时', () => {
    const r = ageInfo('1995-06-15', '2026-01-10')
    expect(r.data.nextBirthday).toBe('2026-06-15')
    expect(r.data.nextBirthdayDays).toBe(156)
  })

  it('生日当天', () => {
    const r = ageInfo('1995-06-15', '2026-06-15')
    expect(r.data.birthdayToday).toBe(true)
    expect(r.data.nextBirthdayDays).toBe(365)
  })
})

describe('ageCalc · 入参校验', () => {
  it('不存在的日期与倒挂日期报错', () => {
    expect(ageInfo('2020-02-30', '2026-01-10').error).toBeTruthy()
    expect(ageInfo('2030-01-01', '2026-01-10').error).toBeTruthy()
    expect(ageInfo('abc', '2026-01-10').error).toBeTruthy()
    expect(ageInfo('1899-12-31', '2026-01-10').error).toBeTruthy()
  })

  it('不传基准日默认今天,不抛错', () => {
    const r = ageInfo('1995-06-15')
    expect(r.error).toBe('')
    expect(r.data.ageYears).toBeGreaterThan(25)
  })
})
