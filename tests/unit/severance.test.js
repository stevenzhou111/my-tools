import { describe, expect, it } from 'vitest'
import { yearsOfService, severance } from '@/utils/severance'

describe('severance · 年限折算(第 47 条)', () => {
  it.each([
    ['2020-03-01', '2023-03-01', 3, '整 3 年 → 3'],
    ['2020-03-01', '2023-10-01', 4, '3 年 7 个月 → 4(6 个月以上按一年)'],
    ['2020-03-01', '2023-07-01', 3.5, '3 年 4 个月 → 3.5(不满 6 个月按半月)'],
    ['2020-03-01', '2022-03-01', 2, '整 2 年 → 2'],
    ['2024-01-01', '2024-11-01', 1, '10 个月 → 1(6 个月以上)'],
    ['2024-01-01', '2024-05-01', 0.5, '4 个月 → 0.5'],
  ])('%s ~ %s → N=%s', (s, e, n) => {
    const r = yearsOfService(s, e)
    expect(r.error).toBe('')
    expect(r.data.n).toBe(n)
  })

  it('差一天的整年:借位后 11 个月,按「6 个月以上」折一年', () => {
    const r = yearsOfService('2020-01-15', '2021-01-14')
    expect(r.data.n).toBe(1)
  })

  it('非法日期报错', () => {
    expect(yearsOfService('', '2023-01-01').error).toBeTruthy()
    expect(yearsOfService('2024-01-01', '2023-01-01').error).toBeTruthy()
  })
})

describe('severance · 金额测算', () => {
  it('月薪 15000、3 年 7 个月:N=4 → 60000', () => {
    const r = severance({ start: '2020-03-01', end: '2023-10-01', wage: 15000 })
    expect(r.error).toBe('')
    expect(r.data.nCapped).toBe(4)
    expect(r.data.compensationN).toBe(60000)
    expect(r.data.compensation2N).toBe(120000)
    expect(r.data.capped).toBe(false)
  })

  it('N+1:代通知金按上月工资', () => {
    const r = severance({ start: '2020-03-01', end: '2023-10-01', wage: 15000, withNotice: true })
    expect(r.data.compensationN1).toBe(75000) // 60000 + 15000
  })

  it('三倍封顶:高薪者基数按三倍且年限≤12', () => {
    // 社平 10000,月薪 50000 > 30000 → 封顶
    const r = severance({ start: '2005-01-01', end: '2024-01-01', wage: 50000, socialAvg: 10000 })
    expect(r.data.capped).toBe(true)
    expect(r.data.nCapped).toBe(12) // 19 年封顶到 12
    expect(r.data.payWage).toBe(30000)
    expect(r.data.compensationN).toBe(360000)
  })

  it('未超三倍不封顶', () => {
    const r = severance({ start: '2020-03-01', end: '2023-10-01', wage: 15000, socialAvg: 10000 })
    expect(r.data.capped).toBe(false)
    expect(r.data.compensationN).toBe(60000)
  })

  it('非法工资报错', () => {
    expect(severance({ start: '2020-03-01', end: '2023-10-01', wage: 0 }).error).toBeTruthy()
    expect(severance({ start: '2020-03-01', end: '2023-10-01', wage: -1 }).error).toBeTruthy()
  })
})
