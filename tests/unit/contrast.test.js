import { describe, expect, it } from 'vitest'
import { contrastRatio, hex, parseHex, relativeLuminance, wcagLevels } from '@/utils/contrast'

describe('parseHex', () => {
  it('支持 3 位与 6 位、带或不带 #', () => {
    expect(parseHex('#ffffff')).toEqual([255, 255, 255])
    expect(parseHex('FFF')).toEqual([255, 255, 255])
    expect(parseHex('#0a0B0c')).toEqual([10, 11, 12])
    expect(parseHex('#000')).toEqual([0, 0, 0])
  })

  it('非法输入返回 null', () => {
    for (const bad of ['', '#', '#12345', 'ggg', '#1234567', null, undefined]) {
      expect(parseHex(bad)).toBeNull()
    }
  })
})

describe('contrastRatio', () => {
  it('黑白对比度为理论上限 21', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5)
    expect(contrastRatio('#fff', '#000')).toBeCloseTo(21, 5)
  })

  it('相同颜色为 1,与颜色顺序无关', () => {
    expect(contrastRatio('#6366f1', '#6366f1')).toBeCloseTo(1, 5)
    expect(contrastRatio('#000000', '#336699')).toBe(
      contrastRatio('#336699', '#000000'),
    )
  })

  it('业界已知基准值:#767676 对白底恰好过 AA(4.5+)', () => {
    const pass = contrastRatio('#767676', '#ffffff')
    const fail = contrastRatio('#777777', '#ffffff')
    expect(pass).toBeGreaterThanOrEqual(4.5)
    expect(fail).toBeLessThan(4.5)
  })

  it('非法颜色返回 null', () => {
    expect(contrastRatio('#ffffff', 'nope')).toBeNull()
  })
})

describe('relativeLuminance', () => {
  it('黑为 0,白为 1', () => {
    expect(relativeLuminance([0, 0, 0])).toBe(0)
    expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1, 5)
  })

  it('绿色通道权重最大(线性化感知亮度)', () => {
    expect(relativeLuminance([0, 255, 0])).toBeGreaterThan(relativeLuminance([255, 0, 0]))
    expect(relativeLuminance([255, 0, 0])).toBeGreaterThan(relativeLuminance([0, 0, 255]))
  })
})

describe('wcagLevels', () => {
  it('阈值与 WCAG 2.1 一致', () => {
    expect(wcagLevels(4.5)).toEqual({ aa: true, aaa: false, aaLarge: true, aaaLarge: true })
    expect(wcagLevels(7)).toEqual({ aa: true, aaa: true, aaLarge: true, aaaLarge: true })
    expect(wcagLevels(3)).toEqual({ aa: false, aaa: false, aaLarge: true, aaaLarge: false })
    expect(wcagLevels(2.9).aaLarge).toBe(false)
  })
})

describe('hex', () => {
  it('拼装小写补零的十六进制', () => {
    expect(hex(0, 10, 255)).toBe('#000aff')
  })
})