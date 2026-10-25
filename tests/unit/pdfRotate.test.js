import { describe, expect, it } from 'vitest'
import { rotatedSize, uprightAnchor } from '@/utils/pdfRotate'

const stub = (w, h, angle) => ({
  getSize: () => ({ width: w, height: h }),
  getRotation: () => ({ angle }),
})

describe('pdfRotate · /Rotate 坐标补偿', () => {
  it('无旋转时原样返回', () => {
    const p = stub(200, 100, 0)
    expect(rotatedSize(p)).toEqual({ width: 200, height: 100 })
    expect(uprightAnchor(p, 10, 20).x).toBe(10)
    expect(uprightAnchor(p, 10, 20).y).toBe(20)
    expect(uprightAnchor(p, 10, 20).rotate.angle).toBe(0)
  })

  it('/Rotate 90:显示宽高互换,锚点映射与直立角正确', () => {
    const p = stub(200, 100, 90) // 未旋转 200×100,显示为 100×200
    expect(rotatedSize(p)).toEqual({ width: 100, height: 200 })
    // 显示坐标 (10,20)(距显示左下)→ 未旋转 (W-yd, xd)
    const a = uprightAnchor(p, 10, 20)
    expect(a.x).toBe(200 - 20)
    expect(a.y).toBe(10)
    expect(a.rotate.angle).toBe(90)
  })

  it('/Rotate 180 与 270 的映射', () => {
    const p180 = stub(200, 100, 180)
    const a = uprightAnchor(p180, 10, 20)
    expect(a.x).toBe(190)
    expect(a.y).toBe(80)
    expect(a.rotate.angle).toBe(180)

    const p270 = stub(200, 100, 270) // 显示为 100×200
    expect(rotatedSize(p270)).toEqual({ width: 100, height: 200 })
    const b = uprightAnchor(p270, 10, 20)
    expect(b.x).toBe(20)
    expect(b.y).toBe(100 - 10)
    expect(b.rotate.angle).toBe(270)
  })

  it('超出 360 的旋转角被归一化', () => {
    const p = stub(200, 100, 450) // 等价 90
    expect(rotatedSize(p)).toEqual({ width: 100, height: 200 })
    expect(uprightAnchor(p, 10, 20).rotate.angle).toBe(90)
  })
})
