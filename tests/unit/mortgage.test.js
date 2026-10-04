import { describe, expect, it } from 'vitest'
import { annuityPayment, combineLoans, loanSchedule, yearlySummary } from '@/utils/mortgage'

// 基准值由 node 按公式现算得出,勿凭记忆手算修改
describe('mortgage · 等额本息', () => {
  const result = loanSchedule({ principal: 1_000_000, annualRate: 0.042, months: 360, method: 'annuity' })

  it('月供固定且等于公式值(4890.171737)', () => {
    expect(result.firstPayment).toBeCloseTo(4890.171737, 4)
    for (const row of result.rows) {
      expect(row.payment).toBeCloseTo(4890.171737, 3)
    }
  })

  it('还款总额与总利息(总还款 1760461.83)', () => {
    expect(result.totalPayment).toBeCloseTo(1760461.83, 1)
    expect(result.totalInterest).toBeCloseTo(760461.83, 1)
  })

  it('末期剩余本金清零、本金利息之和等于月供', () => {
    expect(result.rows[359].balance).toBeCloseTo(0, 6)
    for (const row of result.rows) {
      expect(row.principal + row.interest).toBeCloseTo(row.payment, 8)
    }
  })

  it('利率为 0 时退化为平摊本金', () => {
    const r = loanSchedule({ principal: 12000, annualRate: 0, months: 12, method: 'annuity' })
    expect(r.firstPayment).toBeCloseTo(1000, 6)
    expect(r.totalInterest).toBe(0)
    expect(annuityPayment(12000, 0, 12)).toBeCloseTo(1000, 6)
  })
})

describe('mortgage · 等额本金', () => {
  const result = loanSchedule({ principal: 1_000_000, annualRate: 0.042, months: 360, method: 'principal' })

  it('首月 6277.78、末月 2787.50,月供逐期递减', () => {
    expect(result.firstPayment).toBeCloseTo(6277.777778, 4)
    expect(result.lastPayment).toBeCloseTo(2787.5, 4)
    for (let i = 1; i < result.rows.length; i++) {
      expect(result.rows[i].payment).toBeLessThanOrEqual(result.rows[i - 1].payment)
    }
  })

  it('总利息 631750.00,低于等额本息', () => {
    expect(result.totalInterest).toBeCloseTo(631750.0, 1)
    const annuity = loanSchedule({ principal: 1_000_000, annualRate: 0.042, months: 360, method: 'annuity' })
    expect(result.totalInterest).toBeLessThan(annuity.totalInterest)
  })

  it('每期本金固定为 2777.78,末期清零', () => {
    for (const row of result.rows) expect(row.principal).toBeCloseTo(1_000_000 / 360, 6)
    expect(result.rows[359].balance).toBeCloseTo(0, 6)
  })
})

describe('mortgage · 组合贷款', () => {
  it('两笔贷款按期合并,月供相加(40万@4.2% + 60万@2.85% = 4437.41)', () => {
    const s1 = loanSchedule({ principal: 400_000, annualRate: 0.042, months: 360, method: 'annuity' })
    const s2 = loanSchedule({ principal: 600_000, annualRate: 0.0285, months: 360, method: 'annuity' })
    const combo = combineLoans([s1, s2])
    expect(combo.firstPayment).toBeCloseTo(4437.413002, 4)
    expect(combo.totalPayment).toBeCloseTo(s1.totalPayment + s2.totalPayment, 6)
    expect(combo.rows).toHaveLength(360)
  })

  it('期限不同时按最长者合并,缺失期按 0', () => {
    const s1 = loanSchedule({ principal: 120_000, annualRate: 0.03, months: 12, method: 'annuity' })
    const s2 = loanSchedule({ principal: 240_000, annualRate: 0.03, months: 24, method: 'annuity' })
    const combo = combineLoans([s1, s2])
    expect(combo.rows).toHaveLength(24)
    expect(combo.rows[11].payment).toBeCloseTo(
      s1.rows[11].payment + s2.rows[11].payment,
      6,
    )
    expect(combo.rows[23].payment).toBeCloseTo(s2.rows[23].payment, 6)
  })

  it('yearlySummary 按年汇总且余额衔接', () => {
    const s = loanSchedule({ principal: 1_000_000, annualRate: 0.042, months: 360, method: 'annuity' })
    const years = yearlySummary(s.rows)
    expect(years).toHaveLength(30)
    expect(years[0].payment).toBeCloseTo(s.rows.slice(0, 12).reduce((a, r) => a + r.payment, 0), 6)
    expect(years[0].balance).toBeCloseTo(s.rows[11].balance, 6)
    expect(years[29].balance).toBeCloseTo(0, 6)
  })
})

describe('mortgage · 参数校验', () => {
  it('非法输入抛出中文错误', () => {
    expect(() => loanSchedule({ principal: 0, annualRate: 0.04, months: 12 })).toThrow('贷款金额')
    expect(() => loanSchedule({ principal: 1000, annualRate: -0.1, months: 12 })).toThrow('年利率')
    expect(() => loanSchedule({ principal: 1000, annualRate: 0.04, months: 0 })).toThrow('期限')
    expect(() => loanSchedule({ principal: 1000, annualRate: 0.04, months: 12.5 })).toThrow('期限')
    expect(() => loanSchedule({ principal: 1000, annualRate: 0.04, months: 12, method: 'xxx' })).toThrow('还款方式')
    expect(() => combineLoans([])).toThrow('至少')
  })
})
