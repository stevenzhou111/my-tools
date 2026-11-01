import { describe, expect, it } from 'vitest'
import { stackedDiscount, normalizeTiers, manjianPlan } from '@/utils/discount'

describe('discount · 折扣', () => {
  it('单重折扣:8.5 折', () => {
    expect(stackedDiscount(200, [8.5])).toEqual({ final: 170, saved: 30, rate: 0.85 })
  })

  it('折上折连乘:85 折再 95 折 = 8.075 折', () => {
    const r = stackedDiscount(100, [8.5, 9.5])
    expect(r.final).toBeCloseTo(80.75, 2)
    expect(r.saved).toBeCloseTo(19.25, 2)
    expect(r.rate).toBeCloseTo(0.8075, 6)
  })

  it('金额保留两位,浮点噪声不外泄', () => {
    expect(stackedDiscount(199, [7.5]).final).toBe(149.25)
    expect(stackedDiscount(10, [8.8]).final).toBe(8.8)
  })

  it('非法入参抛出可读错误', () => {
    expect(() => stackedDiscount(0, [8.5])).toThrow()
    expect(() => stackedDiscount(100, [0])).toThrow()
    expect(() => stackedDiscount(100, [11])).toThrow()
  })
})

describe('discount · 满减档位', () => {
  it('normalizeTiers:过滤非法档、同门槛保留减得多的、按门槛升序', () => {
    const tiers = normalizeTiers([
      { min: 400, off: 70 },
      { min: 200, off: 30 },
      { min: 200, off: 50 }, // 同门槛,保留这个
      { min: 0, off: 10 }, // 非法
      { min: 100, off: -5 }, // 非法
    ])
    expect(tiers).toEqual([
      { min: 200, off: 50 },
      { min: 400, off: 70 },
    ])
  })
})

describe('discount · 凑单建议', () => {
  const TIERS = [
    { min: 200, off: 30 },
    { min: 400, off: 70 },
  ]

  it('未达任何门槛:save 为 0,给出到最低档的差距', () => {
    const r = manjianPlan(168, TIERS)
    expect(r.save).toBe(0)
    expect(r.next).toEqual({ min: 200, off: 30 })
    expect(r.gap).toBe(32)
    // 差 32 才省 30 → 不值得
    expect(r.worth).toBe(false)
  })

  it('差一点到下一档且值得凑', () => {
    // 已达 200 减 30,再差 18 到 400 减 70:多省 40 > 垫 18 → 值得
    const r = manjianPlan(382, TIERS)
    expect(r.save).toBe(30)
    expect(r.gap).toBe(18)
    expect(r.worth).toBe(true)
    expect(r.addWorth).toBe(22)
  })

  it('垫付超过增量优惠时不建议凑', () => {
    const r = manjianPlan(300, TIERS)
    expect(r.gap).toBe(100)
    expect(r.worth).toBe(false)
  })

  it('已到最高档:没有下一档', () => {
    const r = manjianPlan(500, TIERS)
    expect(r.save).toBe(70)
    expect(r.next).toBeNull()
    expect(r.gap).toBe(0)
    expect(r.worth).toBe(false)
  })

  it('购物车金额为负抛错', () => {
    expect(() => manjianPlan(-1, TIERS)).toThrow()
  })
})
