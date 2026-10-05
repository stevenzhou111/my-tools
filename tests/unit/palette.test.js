import { describe, expect, it } from 'vitest'
import { extractPalette } from '@/utils/palette'

// 构造纯色像素块
function solid(count, [r, g, b], alpha = 255) {
  return new Uint8ClampedArray(Array.from({ length: count * 4 }, (_, i) => (i % 4 === 3 ? alpha : [r, g, b][i % 4])))
}
function concat(...arrays) {
  const total = arrays.reduce((s, a) => s + a.length, 0)
  const out = new Uint8ClampedArray(total)
  let offset = 0
  for (const a of arrays) {
    out.set(a, offset)
    offset += a.length
  }
  return out
}

describe('palette · extractPalette', () => {
  it('纯红 60% + 纯蓝 40%,比例与颜色精确', () => {
    const px = concat(solid(60, [255, 0, 0]), solid(40, [0, 0, 255]))
    const pal = extractPalette(px, 5)
    expect(pal).toHaveLength(2)
    expect(pal[0].hex).toBe('#ff0000')
    expect(pal[0].ratio).toBeCloseTo(0.6, 6)
    expect(pal[1].hex).toBe('#0000ff')
    expect(pal[1].ratio).toBeCloseTo(0.4, 6)
  })

  it('按占比降序,最多返回 count 个', () => {
    const px = concat(solid(50, [255, 0, 0]), solid(30, [0, 255, 0]), solid(20, [0, 0, 255]))
    const pal = extractPalette(px, 2)
    expect(pal).toHaveLength(2)
    expect(pal.map((c) => c.hex)).toEqual(['#ff0000', '#00ff00'])
    expect(pal[0].ratio).toBeCloseTo(0.5, 6)
  })

  it('同一量化桶内的杂色取平均', () => {
    // 250 与 240 同在高 4 位桶(15),均值 245 → 0xf5
    const px = concat(solid(30, [250, 250, 250]), solid(30, [240, 240, 240]))
    const pal = extractPalette(px, 1)
    expect(pal[0].hex).toBe('#f5f5f5')
    expect(pal[0].ratio).toBe(1)
  })

  it('透明像素(alpha < 128)不参与统计', () => {
    const px = concat(solid(50, [255, 0, 0]), solid(50, [0, 0, 255], 100))
    const pal = extractPalette(px, 5)
    expect(pal).toHaveLength(1)
    expect(pal[0].hex).toBe('#ff0000')
  })

  it('count 钳制在 1~12,空像素返回空数组', () => {
    const px = concat(solid(10, [255, 0, 0]), solid(10, [0, 255, 0]), solid(10, [0, 0, 255]))
    expect(extractPalette(px, 99)).toHaveLength(3)
    expect(extractPalette(px, 0)).toHaveLength(1)
    expect(extractPalette(new Uint8ClampedArray(0), 5)).toEqual([])
  })
})
