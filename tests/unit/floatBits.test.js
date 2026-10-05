import { describe, expect, it } from 'vitest'
import { float32Bits, float64Bits } from '@/utils/floatBits'

// 位型基准由 node DataView(setFloat64/setFloat32 后按字节读出)现算
describe('floatBits · 64 位', () => {
  it('常用数值的十六进制位型', () => {
    expect(float64Bits(0.1).hex).toBe('3fb999999999999a')
    expect(float64Bits(0.2).hex).toBe('3fc999999999999a')
    expect(float64Bits(0.1 + 0.2).hex).toBe('3fd3333333333334')
    expect(float64Bits(1).hex).toBe('3ff0000000000000')
  })

  it('0.1 + 0.2 ≠ 0.3:位型确实不同', () => {
    expect(float64Bits(0.1 + 0.2).hex).not.toBe(float64Bits(0.3).hex)
  })

  it('符号 / 指数 / 尾数拆分(1.0 = 2^0)', () => {
    const b = float64Bits(1)
    expect(b.signBit).toBe('0')
    expect(b.expBits).toBe('01111111111')
    expect(b.exponent).toBe(0)
    expect(/^0+$/.test(b.fracBits)).toBe(true)
    expect(b.kind).toBe('normal')
  })

  it('特殊值分类', () => {
    expect(float64Bits(-0).hex).toBe('8000000000000000')
    expect(float64Bits(-0).kind).toBe('zero')
    expect(float64Bits(Infinity).hex).toBe('7ff0000000000000')
    expect(float64Bits(Infinity).kind).toBe('infinity')
    expect(float64Bits(-Infinity).hex).toBe('fff0000000000000')
    expect(float64Bits(NaN).hex).toBe('7ff8000000000000')
    expect(float64Bits(NaN).kind).toBe('nan')
    expect(float64Bits(1e308 * 10).kind).toBe('infinity')
  })

  it('次正规数与非零尾数分类', () => {
    const sub = float64Bits(5e-324) // 最小次正规数
    expect(sub.kind).toBe('subnormal')
    expect(float64Bits(1.5).kind).toBe('normal')
    expect(float64Bits(1.5).fracBits.startsWith('100')).toBe(true)
  })

  it('负数符号位', () => {
    expect(float64Bits(-1).signBit).toBe('1')
    expect(float64Bits(-1).sign).toBe(-1)
  })
})

describe('floatBits · 32 位', () => {
  it('常用数值的十六进制位型', () => {
    expect(float32Bits(0.1).hex).toBe('3dcccccd')
    expect(float32Bits(1).hex).toBe('3f800000')
    expect(float32Bits(65504).hex).toBe('477fe000')
  })

  it('32 位精度损失可见(0.1 舍入后回读 ≠ 0.1)', () => {
    const b = float32Bits(0.1)
    expect(b.value).not.toBe(0.1)
    expect(b.value).toBeCloseTo(0.1, 7)
  })

  it('特殊值', () => {
    expect(float32Bits(Infinity).kind).toBe('infinity')
    expect(float32Bits(NaN).kind).toBe('nan')
    expect(float32Bits(0).kind).toBe('zero')
  })
})
