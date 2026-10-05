import { describe, expect, it } from 'vitest'
import { convertRate, ratesFromAnnual, toAnnual } from '@/utils/rate'

describe('rate · 单利', () => {
  it('年 → 日/月(365 天与 12 月口径)', () => {
    expect(ratesFromAnnual(18.25)).toEqual({ annual: 18.25, monthly: 18.25 / 12, daily: 0.05 })
    expect(ratesFromAnnual(3.1).monthly).toBeCloseTo(3.1 / 12, 10)
  })

  it('日息万五 → 年化 18.25%(单利)', () => {
    expect(toAnnual(0.05, 'daily')).toBeCloseTo(18.25, 10)
  })

  it('月息 1 分(1%)→ 年化 12%', () => {
    expect(toAnnual(1, 'monthly')).toBeCloseTo(12, 10)
  })

  it('convertRate 往返一致', () => {
    const r = convertRate(0.05, 'daily')
    expect(r.daily).toBeCloseTo(0.05, 10)
    expect(r.monthly).toBeCloseTo((0.05 * 365) / 12, 8)
    expect(r.annual).toBeCloseTo(18.25, 8)
  })
})

describe('rate · 复利', () => {
  it('日息万五复利年化 ≈ 20.02%(实际日利率口径)', () => {
    expect(toAnnual(0.05, 'daily', true)).toBeCloseTo(((1 + 0.0005) ** 365 - 1) * 100, 6)
  })

  it('月息复利年化 = (1+月)^12 - 1', () => {
    expect(toAnnual(1, 'monthly', true)).toBeCloseTo((1.01 ** 12 - 1) * 100, 8)
  })

  it('ratesFromAnnual 复利可逆(年→日→年回到原值)', () => {
    const down = ratesFromAnnual(12, true)
    expect(toAnnual(down.daily, 'daily', true)).toBeCloseTo(12, 6)
    expect(toAnnual(down.monthly, 'monthly', true)).toBeCloseTo(12, 6)
  })

  it('convertRate 校验 from 参数', () => {
    expect(() => convertRate(5, 'weekly')).toThrow('daily / monthly / annual')
  })
})

describe('rate · 参数校验', () => {
  it('负数、非数字、超大值抛错', () => {
    expect(() => ratesFromAnnual(-1)).toThrow('利率')
    expect(() => ratesFromAnnual(NaN)).toThrow('利率')
    expect(() => toAnnual(10001, 'daily')).toThrow('利率')
    expect(() => toAnnual(0, 'daily')).not.toThrow()
  })
})
