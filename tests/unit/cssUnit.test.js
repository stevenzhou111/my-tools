import { describe, expect, it } from 'vitest'
import {
  convertCss,
  formatCssNumber,
  fromPx,
  paperPixels,
  paperRows,
  toPx,
} from '@/utils/cssUnit'

const opts = { root: 16, parent: 16, viewportWidth: 1000, viewportHeight: 500 }

function row(result, id) {
  return result.rows.find((r) => r.id === id).value
}

describe('toPx / fromPx', () => {
  it('绝对单位按 CSS 参考换算', () => {
    expect(toPx(16, 'px', opts)).toBe(16)
    expect(toPx(12, 'pt', opts)).toBe(16)
    expect(toPx(1, 'pc', opts)).toBe(16)
    expect(toPx(1, 'in', opts)).toBe(96)
    expect(toPx(2.54, 'cm', opts)).toBeCloseTo(96, 6)
    expect(toPx(25.4, 'mm', opts)).toBeCloseTo(96, 6)
  })

  it('相对与视口单位使用传入的上下文', () => {
    expect(toPx(1.5, 'rem', { root: 20 })).toBe(30)
    expect(toPx(2, 'em', { parent: 14 })).toBe(28)
    expect(toPx(50, '%', { parent: 18 })).toBe(9)
    expect(toPx(10, 'vw', opts)).toBe(100)
    expect(toPx(10, 'vh', opts)).toBe(50)
    expect(toPx(10, 'vmin', opts)).toBe(50)
    expect(toPx(10, 'vmax', opts)).toBe(100)
  })

  it('反向换算恢复原值', () => {
    expect(fromPx(16, 'pt', opts)).toBeCloseTo(12, 6)
    expect(fromPx(28, 'em', { parent: 14 })).toBe(2)
    expect(fromPx(9, '%', { parent: 18 })).toBe(50)
    expect(fromPx(100, 'vw', opts)).toBe(10)
  })
})

describe('convertCss', () => {
  it('一次得到全部单位', () => {
    const result = convertCss(16, 'px', opts)
    expect(result.error).toBe('')
    expect(result.rows).toHaveLength(13)
    expect(row(result, 'rem')).toBe(1)
    expect(row(result, 'em')).toBe(1)
    expect(row(result, '%')).toBe(100)
    expect(row(result, 'pt')).toBeCloseTo(12, 6)
    expect(row(result, 'in')).toBeCloseTo(1 / 6, 6)
    expect(row(result, 'vw')).toBeCloseTo(1.6, 6)
    expect(row(result, 'vh')).toBeCloseTo(3.2, 6)
  })

  it('非法输入与无效上下文给出错误', () => {
    expect(convertCss('', 'px').error).toBeTruthy()
    expect(convertCss(10, 'nope').error).toBeTruthy()
    expect(convertCss('abc', 'px').error).toBeTruthy()
    expect(convertCss(10, 'px', { root: 0 }).error).toBeTruthy()
    expect(convertCss(10, 'px', { viewportWidth: 0 }).error).toBeTruthy()
  })
})

describe('formatCssNumber', () => {
  it('去掉浮点噪声与末尾 0', () => {
    expect(formatCssNumber(16.000000000000004)).toBe('16')
    expect(formatCssNumber(0.4233333333)).toBe('0.4233')
    expect(formatCssNumber(0)).toBe('0')
    expect(formatCssNumber(Number.NaN)).toBe('—')
  })

  it('极端值使用科学计数法', () => {
    expect(formatCssNumber(1234567890)).toBe('1.2346e+9')
    expect(formatCssNumber(0.00001)).toBe('1.0000e-5')
  })
})

describe('paperPixels', () => {
  it('A4 在 300 DPI 下的像素尺寸', () => {
    const r = paperPixels(210, 297, 300)
    expect(r.width).toBe(2480)
    expect(r.height).toBe(3508)
    expect(r.megapixels).toBeCloseTo(8.69984, 5)
  })

  it('非法尺寸返回 0', () => {
    expect(paperPixels(0, 297, 300)).toMatchObject({ width: 0, height: 0 })
    expect(paperPixels(210, 297, 0)).toMatchObject({ width: 0, height: 0 })
  })

  it('批量 DPI 行保持顺序', () => {
    const rows = paperRows(210, 297)
    expect(rows.map((r) => r.dpi)).toEqual([72, 96, 150, 300])
    expect(rows[0].width).toBe(595)
  })
})