import { describe, expect, it } from 'vitest'
import { annualBonusTax, salarySchedule } from '@/utils/incomeTax'
import { compoundFV, plan, sipFV } from '@/utils/compound'

describe('incomeTax · 累计预扣法', () => {
  it('月薪 1 万:1 月预扣 150,第 8 月跳档到 10% 档', () => {
    const { rows, totalTax } = salarySchedule({ salary: 10000, months: 12 })
    expect(rows[0].tax).toBe(150)
    expect(rows[6].tax).toBe(150)
    // 8 月累计应纳税所得额 40000 → 40000×10%−2520 = 1480,已预扣 7×150=1050
    expect(rows[7].tax).toBe(430)
    // 全年应纳税所得额 60000 → 3480
    expect(totalTax).toBe(3480)
    expect(rows[11].cumTax).toBe(3480)
  })

  it('扣除项降低税基:低薪按 3% 匀速', () => {
    const { rows, totalTax } = salarySchedule({ salary: 8000, insurance: 1000, special: 1500, months: 12 })
    // 每月应纳税所得额 500 → 15 元
    expect(rows.every((r) => r.tax === 15)).toBe(true)
    expect(totalTax).toBe(180)
  })

  it('逐月净到手合计 = 全年收入 − 五险一金 − 个税', () => {
    const { rows, totalNet, totalTax } = salarySchedule({ salary: 25000, insurance: 3000, special: 1000, months: 12 })
    const sum = rows.reduce((s, r) => s + r.net, 0)
    expect(totalNet).toBeCloseTo(sum, 6)
    expect(totalNet).toBeCloseTo((25000 - 3000) * 12 - totalTax, 6)
  })
})

describe('incomeTax · 年终奖单独计税', () => {
  it('36000 → 3% 档 1080', () => {
    expect(annualBonusTax(36000)).toEqual({ tax: 1080, rate: 0.03, after: 34920 })
  })

  it('36001 出现临界跳档(多 1 元多缴 2310.1 元的经典陷阱)', () => {
    expect(annualBonusTax(36001).tax).toBeCloseTo(36001 * 0.1 - 210, 6)
    expect(annualBonusTax(36001).tax).toBeGreaterThan(annualBonusTax(36000).tax + 2000)
  })

  it('零与非法输入', () => {
    expect(annualBonusTax(0).tax).toBe(0)
    expect(annualBonusTax(-5).tax).toBe(0)
    expect(annualBonusTax('abc').tax).toBe(0)
  })
})

describe('compound · 复利与定投', () => {
  it('一次性本金按年复利', () => {
    expect(compoundFV(100, 0.1, 2)).toBeCloseTo(121, 6)
    expect(compoundFV(10000, 0, 10)).toBe(10000)
  })

  it('每月定投(期末普通年金)', () => {
    // 1000/月 × 12 期 @3%:1000 × [(1.0025^12 − 1)/0.0025]
    expect(sipFV(1000, 0.03, 12)).toBeCloseTo(12166.38, 1)
    expect(sipFV(1000, 0, 12)).toBe(12000)
    // 期初投入比期末多增值一个月
    expect(sipFV(1000, 0.03, 12, { begin: true })).toBeCloseTo(12166.38 * 1.0025, 1)
  })

  it('plan 明细:投入、终值、利息自洽', () => {
    const { rows, totalInvested, totalFV, totalInterest } = plan({
      principal: 100000,
      monthly: 2000,
      annualRate: 0.04,
      years: 3,
    })
    expect(rows).toHaveLength(3)
    expect(rows[1].invested).toBe(100000 + 2000 * 24)
    expect(totalFV).toBeCloseTo(compoundFV(100000, 0.04, 3) + sipFV(2000, 0.04, 36), 6)
    expect(totalInterest).toBeCloseTo(totalFV - totalInvested, 6)
  })
})
