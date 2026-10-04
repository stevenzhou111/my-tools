import { describe, expect, it } from 'vitest'
import { framesToGifBlob } from '@/utils/gif'

function solidRgba(size, [r, g, b]) {
  const rgba = new Uint8Array(size * size * 4)
  for (let i = 0; i < size * size; i++) {
    rgba[i * 4] = r
    rgba[i * 4 + 1] = g
    rgba[i * 4 + 2] = b
    rgba[i * 4 + 3] = 255
  }
  return rgba
}

describe('framesToGifBlob', () => {
  it('输出 GIF89a 魔数', async () => {
    const blob = await framesToGifBlob([
      { rgba: solidRgba(4, [255, 0, 0]), width: 4, height: 4, delay: 200 },
    ])
    const bytes = new Uint8Array(await blob.arrayBuffer())
    expect([bytes[0], bytes[1], bytes[2], bytes[3], bytes[4], bytes[5]]).toEqual([
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61, // "GIF89a"
    ])
    expect(blob.type).toBe('image/gif')
  })

  it('两帧的体积大于一帧(帧确实写进去了)', async () => {
    const one = await framesToGifBlob([{ rgba: solidRgba(8, [0, 128, 255]), width: 8, height: 8 }])
    const two = await framesToGifBlob([
      { rgba: solidRgba(8, [0, 128, 255]), width: 8, height: 8 },
      { rgba: solidRgba(8, [255, 128, 0]), width: 8, height: 8 },
    ])
    expect(two.size).toBeGreaterThan(one.size)
  })

  it('空帧列表报错', async () => {
    await expect(framesToGifBlob([])).rejects.toThrow(/至少/)
  })

  it('透明模式下输出仍然合法', async () => {
    const rgba = solidRgba(4, [255, 255, 255])
    for (let i = 3; i < rgba.length; i += 4) rgba[i] = 0 // 全透明
    const blob = await framesToGifBlob([{ rgba, width: 4, height: 4 }], { transparent: true })
    const bytes = new Uint8Array(await blob.arrayBuffer())
    expect(bytes.slice(0, 6)).toEqual(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]))
  })

  it('每帧可带独立延迟(不抛错即接受)', async () => {
    const blob = await framesToGifBlob([
      { rgba: solidRgba(4, [1, 2, 3]), width: 4, height: 4, delay: 100 },
      { rgba: solidRgba(4, [3, 2, 1]), width: 4, height: 4, delay: 500 },
    ])
    expect(blob.size).toBeGreaterThan(0)
  })
})
