import { describe, expect, it } from 'vitest'
import { insuranceBreakdown, netFromGross, grossFromNet } from '@/utils/salary'

describe('salary · 五险一金明细', () => {
  it('常用比例:20000 基数、公积金 12% → 合计 4500', () => {
    const r = insuranceBreakdown(20000, 12)
    expect(r.parts.find((p) => p.id === 'pension').amount).toBe(1600)
    expect(r.parts.find((p) => p.id === 'medical').amount).toBe(400)
    expect(r.parts.find((p) => p.id === 'unemployment').amount).toBe(100)
    expect(r.housing.amount).toBe(2400)
    expect(r.total).toBe(4500)
  })

  it('公积金比例钳制在 5~12', () => {
    expect(insuranceBreakdown(10000, 20).housing.rate).toBe(0.12)
    expect(insuranceBreakdown(10000, 1).housing.rate).toBe(0.05)
  })
})

describe('salary · 税前→税后(累计预扣)', () => {
  it('月薪 20000、基数 20000、公积金 12%、无专项:首月个税 315、到手 15185', () => {
    const r = netFromGross(20000, { base: 20000, housingPct: 12, special: 0 })
    // 月应纳税所得 20000 − 4500 − 5000 = 10500;首月累计 10500 ≤ 36000 → 3%
    expect(r.taxFirst).toBe(315)
    expect(r.netFirst).toBe(15185)
  })

  it('全年个税:126000 应纳税 → 10% 档,annualTax 10080,平均到手 14660', () => {
    const r = netFromGross(20000, { base: 20000, housingPct: 12, special: 0 })
    expect(r.annualTax).toBe(10080)
    expect(r.avgNet).toBe(14660)
  })

  it('年末跳档:第 12 月个税高于首月', () => {
    const r = netFromGross(20000, { base: 20000, housingPct: 12, special: 0 })
    expect(r.netLast).toBeLessThan(r.netFirst)
  })

  it('专项附加扣除降低税额', () => {
    const withSpecial = netFromGross(20000, { base: 20000, housingPct: 12, special: 1500 })
    const without = netFromGross(20000, { base: 20000, housingPct: 12, special: 0 })
    expect(withSpecial.annualTax).toBeLessThan(without.annualTax)
  })
})

describe('salary · 税后→税前(二分反推)', () => {
  it('平均到手 14660 反推回 20000', () => {
    const r = grossFromNet(14660, { housingPct: 12, special: 0 })
    expect(r.gross).toBeCloseTo(20000, 0)
  })

  it('往返一致:任意税前的平均到手,反推回税前', () => {
    for (const g of [8000, 15000, 35000]) {
      const { avgNet } = netFromGross(g, { base: g, housingPct: 12, special: 0 })
      const r = grossFromNet(avgNet, { housingPct: 12, special: 0 })
      expect(r.gross).toBeCloseTo(g, 0)
    }
  })

  it('非法输入抛错', () => {
    expect(() => grossFromNet(0)).toThrow()
    expect(() => grossFromNet(-5)).toThrow()
  })
})
