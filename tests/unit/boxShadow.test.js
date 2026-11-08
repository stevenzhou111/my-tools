import { describe, expect, it } from 'vitest'
import { boxShadowCss, hexToRgba } from '../../src/utils/boxShadow'

describe('boxShadow · CSS 生成', () => {
  it('hexToRgba:三位/六位 hex + 透明度', () => {
    expect(hexToRgba('#000000', 100)).toBe('rgba(0, 0, 0, 1)')
    expect(hexToRgba('#fff', 50)).toBe('rgba(255, 255, 255, 0.5)')
    expect(hexToRgba('#6366f1', 0)).toBe('rgba(99, 102, 241, 0)')
  })

  it('hexToRgba:非法输入回退黑色;透明度钳制 0~1', () => {
    expect(hexToRgba('red', 100)).toBe('rgba(0, 0, 0, 1)')
    expect(hexToRgba('#000', 200)).toBe('rgba(0, 0, 0, 1)')
    expect(hexToRgba('#000', -5)).toBe('rgba(0, 0, 0, 0)')
  })

  it('boxShadowCss:标准四值 + 颜色', () => {
    expect(boxShadowCss({ x: 0, y: 4, blur: 12, spread: 0, color: '#000000', opacity: 20 })).toBe(
      '0px 4px 12px 0px rgba(0, 0, 0, 0.2)',
    )
  })

  it('boxShadowCss:inset 在最前;非法数值回退 0px', () => {
    expect(boxShadowCss({ x: 2, y: 2, blur: 6, spread: 1, color: '#6366f1', opacity: 100, inset: true })).toBe(
      'inset 2px 2px 6px 1px rgba(99, 102, 241, 1)',
    )
    expect(boxShadowCss({ x: 'bad', color: '#000000', opacity: 100 })).toBe('0px 0px 0px 0px rgba(0, 0, 0, 1)')
  })

  it('boxShadowCss:空对象给出全零默认', () => {
    expect(boxShadowCss()).toBe('0px 0px 0px 0px rgba(0, 0, 0, 1)')
  })
})
