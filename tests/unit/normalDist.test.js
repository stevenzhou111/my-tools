import { describe, expect, it } from 'vitest'
import { stdCdf, cdf, stdPpf, ppf, zScore } from '@/utils/normalDist'

describe('normalDist · CDF', () => {
  it('对称性:Φ(0) = 0.5,Φ(−x) = 1 − Φ(x)', () => {
    // A&S erf 近似在 0 处有 ~5e-10 的固有误差,展示用足够
    expect(stdCdf(0)).toBeCloseTo(0.5, 8)
    for (const x of [0.5, 1.5, 2.5]) {
      expect(stdCdf(-x)).toBeCloseTo(1 - stdCdf(x), 6)
    }
  })

  it('教科书值(已与独立参考实现交叉核对)', () => {
    expect(stdCdf(1.96)).toBeCloseTo(0.9750021, 5)
    expect(stdCdf(1.6449)).toBeCloseTo(0.9500048, 5)
    expect(stdCdf(2.5758)).toBeCloseTo(0.9949996, 5)
  })

  it('非标准参数:N(100, 15) 中 X≤130 相当于 z=2', () => {
    expect(cdf(130, 100, 15)).toBeCloseTo(stdCdf(2), 6)
    expect(zScore(130, 100, 15)).toBeCloseTo(2, 10)
  })

  it('σ ≤ 0 抛错', () => {
    expect(() => cdf(1, 0, 0)).toThrow()
    expect(() => zScore(1, 0, -1)).toThrow()
  })
})

describe('normalDist · PPF(Acklam)', () => {
  it('与 CDF 互逆:ppf(cdf(x)) ≈ x', () => {
    for (const x of [-2.3, -1, -0.1, 0, 0.75, 1.96, 3.1]) {
      expect(stdPpf(stdCdf(x))).toBeCloseTo(x, 6)
    }
  })

  it('常用临界值:0.975 → 1.96,0.95 → 1.6449,0.995 → 2.5758', () => {
    expect(stdPpf(0.975)).toBeCloseTo(1.959964, 4)
    expect(stdPpf(0.95)).toBeCloseTo(1.644854, 4)
    expect(stdPpf(0.995)).toBeCloseTo(2.575829, 4)
  })

  it('极端尾部(0.0001 / 0.9999)仍对称', () => {
    expect(stdPpf(0.0001)).toBeCloseTo(-stdPpf(0.9999), 6)
  })

  it('非标准参数与越界', () => {
    expect(ppf(0.975, 100, 15)).toBeCloseTo(100 + 1.959964 * 15, 3)
    expect(() => stdPpf(0)).toThrow()
    expect(() => stdPpf(1)).toThrow()
    expect(() => ppf(0.5, 0, 0)).toThrow()
  })
})
