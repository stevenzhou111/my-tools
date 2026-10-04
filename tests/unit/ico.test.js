import { describe, expect, it } from 'vitest'
import { buildIco, pngSize } from '@/utils/ico'
import { deflateSync } from 'node:zlib'

// 构造最小合法 PNG:签名 + IHDR(13 字节数据)+ IDAT + IEND
function fakePng(width, height) {
  const ihdr = new Uint8Array(17)
  const v = new DataView(ihdr.buffer)
  v.setUint32(0, 13) // IHDR 数据长度
  ihdr.set([0x49, 0x48, 0x44, 0x52], 4) // "IHDR"
  v.setUint32(8, width)
  v.setUint32(12, height)
  ihdr[16] = 8 // bit depth
  const crc = [0, 0, 0, 0]
  const idat = new Uint8Array(deflateSync(Buffer.alloc(8)))
  const chunks = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    new Uint8Array([0, 0, 0, 13, ...ihdr.slice(4), ...crc]),
    new Uint8Array([0, 0, 0, idat.length, 0x49, 0x44, 0x41, 0x54, ...idat, 0, 0, 0, 0]),
    new Uint8Array([0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44]),
  ]
  const total = chunks.reduce((n, c) => n + c.length, 0)
  const out = new Uint8Array(total)
  let o = 0
  for (const c of chunks) {
    out.set(c, o)
    o += c.length
  }
  return out
}

describe('pngSize', () => {
  it('从 IHDR 读出宽高', () => {
    expect(pngSize(fakePng(16, 32))).toEqual({ width: 16, height: 32 })
  })

  it('非 PNG 抛错', () => {
    expect(() => pngSize(new Uint8Array([1, 2, 3]))).toThrow(/PNG/)
  })
})

describe('buildIco', () => {
  const png16 = fakePng(16, 16)
  const png32 = fakePng(32, 32)
  const png256 = fakePng(256, 256)

  it('头部:reserved=0 / type=1 / count=帧数', () => {
    const ico = buildIco([
      { size: 16, data: png16 },
      { size: 32, data: png32 },
    ])
    const view = new DataView(ico.buffer)
    expect(view.getUint16(0, true)).toBe(0)
    expect(view.getUint16(2, true)).toBe(1)
    expect(view.getUint16(4, true)).toBe(2)
  })

  it('目录项:尺寸、数据长度与偏移链正确', () => {
    const ico = buildIco([
      { size: 16, data: png16 },
      { size: 32, data: png32 },
    ])
    const view = new DataView(ico.buffer)
    // 第一帧(entry 0,起始字节 6):宽、planes、数据长度、数据偏移
    expect(ico[6]).toBe(16)
    expect(view.getUint16(6 + 4, true)).toBe(1) // planes
    expect(view.getUint16(6 + 6, true)).toBe(32) // bitcount
    expect(view.getUint32(6 + 8, true)).toBe(png16.length)
    expect(view.getUint32(6 + 12, true)).toBe(6 + 16 * 2)
    // 第二帧(entry 1,起始字节 22)
    expect(ico[22]).toBe(32)
    expect(view.getUint32(22 + 8, true)).toBe(png32.length)
    expect(view.getUint32(22 + 12, true)).toBe(6 + 16 * 2 + png16.length)
  })

  it('总长 = 头 + 目录 + 全部图像数据,数据原样内嵌', () => {
    const ico = buildIco([
      { size: 16, data: png16 },
      { size: 32, data: png32 },
    ])
    expect(ico.length).toBe(6 + 32 + png16.length + png32.length)
    expect(ico.slice(38, 38 + 8)).toEqual(png16.slice(0, 8)) // PNG 签名原样在数据区
  })

  it('256 帧的尺寸字段写 0(规范约定)', () => {
    const ico = buildIco([{ size: 256, data: png256 }])
    expect(ico[6]).toBe(0)
    expect(ico[7]).toBe(0)
  })

  it('空图像列表抛错,超 256 抛错', () => {
    expect(() => buildIco([])).toThrow(/至少/)
    expect(() => buildIco([{ size: 512, data: png256 }])).toThrow(/256/)
  })
})