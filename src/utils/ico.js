/**
 * .ico 文件封装:把若干张 PNG(Vista+ 支持内嵌 PNG)打包成 ICO,
 * 结构 = 6 字节头 + 每图 16 字节目录项 + 图像数据。
 */

/**
 * @param {Array<{size:number, data:Uint8Array}>} images PNG 数据,按 size 升序传入
 * @returns {Uint8Array} .ico 字节流
 */
export function buildIco(images) {
  if (!images.length) throw new Error('至少需要一张图像')
  const headerSize = 6 + 16 * images.length
  const total = images.reduce((n, img) => n + img.data.length, headerSize)
  const out = new Uint8Array(total)
  const view = new DataView(out.buffer)

  // ICONDIR:reserved=0, type=1(icon), count
  view.setUint16(0, 0, true)
  view.setUint16(2, 1, true)
  view.setUint16(4, images.length, true)

  let offset = headerSize
  images.forEach((img, i) => {
    if (img.size > 256) throw new Error('ICO 单帧尺寸不能超过 256')
    const entry = 6 + 16 * i
    const sizeByte = img.size === 256 ? 0 : img.size
    // ICONDIRENTRY(16 字节):w/h 各 1 字节(256 记 0)、colors、reserved 各 1 字节,
    // planes 与 bitcount 各 2 字节,数据长度与偏移各 4 字节
    out[entry] = sizeByte
    out[entry + 1] = sizeByte
    out[entry + 2] = 0
    out[entry + 3] = 0
    view.setUint16(entry + 4, 1, true) // planes
    view.setUint16(entry + 6, 32, true) // bitcount
    view.setUint32(entry + 8, img.data.length, true)
    view.setUint32(entry + 12, offset, true)
    out.set(img.data, offset)
    offset += img.data.length
  })

  return out
}

/** PNG 字节流的宽高:解析 IHDR(第 16~24 字节),非法 PNG 抛错 */
export function pngSize(data) {
  const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  for (let i = 0; i < 8; i++) {
    if (data[i] !== PNG_SIG[i]) throw new Error('不是合法的 PNG 数据')
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  return { width: view.getUint32(16), height: view.getUint32(20) }
}