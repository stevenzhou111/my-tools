import { describe, expect, it } from 'vitest'
import { buildScale, hexToHsl, hslToHex, readableOn, STEPS, toCssVars, toTailwind } from '@/utils/colorScale'

// 基准值由 node 按转换公式现算得出
describe('colorScale · hex ↔ hsl', () => {
  it('常用颜色基准', () => {
    expect(hexToHsl('#3b82f6')).toEqual({ h: 217, s: 91, l: 60 })
    expect(hexToHsl('#e11d48')).toEqual({ h: 347, s: 77, l: 50 })
    expect(hexToHsl('#7c3aed')).toEqual({ h: 262, s: 83, l: 58 })
    expect(hexToHsl('#000')).toEqual({ h: 0, s: 0, l: 0 })
    expect(hexToHsl('#fff')).toEqual({ h: 0, s: 0, l: 100 })
  })

  it('非法输入返回 null', () => {
    expect(hexToHsl('blue')).toBe(null)
    expect(hexToHsl('#12345')).toBe(null)
    expect(hexToHsl('')).toBe(null)
    expect(hexToHsl(undefined)).toBe(null)
  })

  it('往返转换稳定(单色取整误差 ≤2%)', () => {
    for (const hex of ['#3b82f6', '#ff5722', '#10b981', '#0ea5e9', '#111827']) {
      const { h, s, l } = hexToHsl(hex)
      const back = hexToHsl(hslToHex(h, s, l))
      expect(Math.abs(back.h - h)).toBeLessThanOrEqual(3)
      expect(Math.abs(back.s - s)).toBeLessThanOrEqual(2)
      expect(Math.abs(back.l - l)).toBeLessThanOrEqual(2)
    }
  })

  it('灰阶(饱和度 0)输出 #xxx 相同灰', () => {
    expect(hslToHex(123, 0, 50)).toBe('#808080')
    expect(hslToHex(0, 0, 0)).toBe('#000000')
  })
})

describe('colorScale · buildScale', () => {
  it('生成 11 档合法色阶,500 档标记 isBase', () => {
    const scale = buildScale('#3b82f6')
    expect(scale.map((c) => c.step)).toEqual(STEPS)
    expect(scale).toHaveLength(11)
    expect(scale.find((c) => c.step === 500).isBase).toBe(true)
    for (const c of scale) expect(c.hex).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('明度单调递减(50 最亮 → 950 最暗)', () => {
    const scale = buildScale('#3b82f6')
    for (let i = 1; i < scale.length; i++) {
      expect(hexToHsl(scale[i].hex).l).toBeLessThanOrEqual(hexToHsl(scale[i - 1].hex).l)
    }
  })

  it('色相保持不变', () => {
    const scale = buildScale('#e11d48')
    for (const c of scale) {
      if (c.step === 500) continue
      expect(Math.abs(hexToHsl(c.hex).h - 347)).toBeLessThanOrEqual(12)
    }
  })

  it('非法颜色返回 null', () => {
    expect(buildScale('nope')).toBe(null)
  })

  it('导出片段:Tailwind 与 CSS 变量', () => {
    const scale = buildScale('#3b82f6')
    expect(toTailwind(scale, 'brand')).toContain("'500': '#")
    expect(toCssVars(scale, 'brand')).toContain('--brand-500: #')
    expect(toTailwind(scale).split('\n')).toHaveLength(13)
  })
})

describe('colorScale · readableOn', () => {
  it('浅底用深字,深底用白字', () => {
    expect(readableOn('#ffffff')).toBe('#1c2130')
    expect(readableOn('#fde047')).toBe('#1c2130')
    expect(readableOn('#000000')).toBe('#ffffff')
    expect(readableOn('#1e3a8a')).toBe('#ffffff')
  })
})
