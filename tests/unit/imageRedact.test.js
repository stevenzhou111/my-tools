import { describe, expect, it } from 'vitest'
import { isEmptyRect, mosaicBlock, normalizeRect } from '@/utils/redact'

describe('normalizeRect', () => {
  it('正向拖拽得到原图坐标矩形', () => {
    expect(normalizeRect({ x: 10, y: 10 }, { x: 50, y: 40 }, 100, 100)).toEqual({ x: 10, y: 10, w: 40, h: 30 })
  })

  it('反向拖拽也能归一化', () => {
    expect(normalizeRect({ x: 50, y: 40 }, { x: 10, y: 10 }, 100, 100)).toEqual({ x: 10, y: 10, w: 40, h: 30 })
  })

  it('超出图像边界的部分被裁掉', () => {
    expect(normalizeRect({ x: -20, y: -5 }, { x: 120, y: 130 }, 100, 100)).toEqual({ x: 0, y: 0, w: 100, h: 100 })
  })

  it('小数坐标按四舍五入取整', () => {
    expect(normalizeRect({ x: 10.4, y: 10.6 }, { x: 50.4, y: 40.6 }, 100, 100)).toEqual({ x: 10, y: 11, w: 40, h: 30 })
  })

  it('非法输入返回空矩形', () => {
    expect(normalizeRect(null, undefined, 100, 100)).toEqual({ x: 0, y: 0, w: 0, h: 0 })
    expect(normalizeRect({ x: 1, y: 1 }, { x: 2, y: 2 }, 0, 0)).toEqual({ x: 0, y: 0, w: 0, h: 0 })
  })
})

describe('isEmptyRect', () => {
  it('小于最小边长的框视为误触', () => {
    expect(isEmptyRect({ x: 0, y: 0, w: 1, h: 20 })).toBe(true)
    expect(isEmptyRect({ x: 0, y: 0, w: 2, h: 2 })).toBe(false)
    expect(isEmptyRect(null)).toBe(true)
  })

  it('可自定义最小边长', () => {
    expect(isEmptyRect({ x: 0, y: 0, w: 3, h: 3 }, 5)).toBe(true)
  })
})

describe('mosaicBlock', () => {
  it('强度映射到 2~30 像素', () => {
    expect(mosaicBlock(0)).toBe(2)
    expect(mosaicBlock(50)).toBe(16)
    expect(mosaicBlock(100)).toBe(30)
  })

  it('越界与非法值被收敛', () => {
    expect(mosaicBlock(-10)).toBe(2)
    expect(mosaicBlock(150)).toBe(30)
    expect(mosaicBlock('abc')).toBe(2)
  })
})