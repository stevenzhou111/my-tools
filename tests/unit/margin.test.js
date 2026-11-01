import { describe, expect, it } from 'vitest'
import { marginStats, priceForMargin, priceForMarkup, marginToMarkup, markupToMargin } from '@/utils/margin'

describe('margin · 结构计算', () => {
  it('成本 60 售价 100:毛利 40、毛利率 40%、加价率 66.7%', () => {
    const r = marginStats(60, 100)
    expect(r.profit).toBe(40)
    expect(r.marginRate).toBeCloseTo(0.4, 6)
    expect(r.markupRate).toBeCloseTo(0.6667, 3)
  })

  it('金额保留三位,浮点噪声不外泄', () => {
    expect(marginStats(0.1, 0.3).profit).toBeCloseTo(0.2, 6)
    expect(marginStats(33.3, 99.9).marginRate).toBeCloseTo(2 / 3, 3)
  })

  it('亏本买卖抛出可读错误', () => {
    expect(() => marginStats(100, 80)).toThrow('亏本')
    expect(() => marginStats(-1, 50)).toThrow()
    expect(() => marginStats(50, 0)).toThrow()
  })
})

describe('margin · 定价反推', () => {
  it('成本 60、目标毛利率 40% → 售价 100', () => {
    expect(priceForMargin(60, 0.4)).toBe(100)
  })

  it('成本 60、目标加价率 66.67% → 售价 100', () => {
    expect(priceForMarkup(60, 2 / 3)).toBeCloseTo(100, 1)
  })

  it('非法入参抛错', () => {
    expect(() => priceForMargin(0, 0.4)).toThrow()
    expect(() => priceForMargin(60, 1)).toThrow() // 毛利率 100% 不可能
    expect(() => priceForMarkup(60, -0.1)).toThrow()
  })
})

describe('margin · 口径互转', () => {
  it('毛利率 20% ↔ 加价率 25%', () => {
    expect(marginToMarkup(0.2)).toBeCloseTo(0.25, 10)
    expect(markupToMargin(0.25)).toBeCloseTo(0.2, 10)
  })

  it('互转往返一致', () => {
    for (const m of [0.1, 0.35, 0.6, 0.8]) {
      expect(markupToMargin(marginToMarkup(m))).toBeCloseTo(m, 10)
    }
  })

  it('越界抛错', () => {
    expect(() => marginToMarkup(0)).toThrow()
    expect(() => marginToMarkup(1.2)).toThrow()
    expect(() => markupToMargin(-0.5)).toThrow()
  })
})
