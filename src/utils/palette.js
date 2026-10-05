/**
 * 图片主色提取:对 RGBA 像素做 4 位/通道(4096 桶)量化,取样本最多的
 * 前 N 个桶,桶内取平均色。纯函数,输入为 getImageData 的 data。
 */

/** 生成桶键:RGB 各取高 4 位拼成 12 位整数 */
function bucketKey(r, g, b) {
  return ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
}

const toHex = (v) => Math.round(v).toString(16).padStart(2, '0')

/**
 * @param {Uint8ClampedArray|number[]} pixels RGBA 序列
 * @param {number} count 主色数量 1~12
 * @returns {{ hex:string, ratio:number, count:number }[]}
 */
export function extractPalette(pixels, count = 6) {
  const raw = Math.floor(Number(count))
  const n = Math.min(12, Math.max(1, Number.isFinite(raw) ? raw : 6))
  const buckets = new Map()
  let total = 0
  for (let i = 0; i + 3 < pixels.length; i += 4) {
    const a = pixels[i + 3]
    if (a < 128) continue // 透明像素不参与
    const r = pixels[i]
    const g = pixels[i + 1]
    const b = pixels[i + 2]
    const key = bucketKey(r, g, b)
    const cur = buckets.get(key)
    if (cur) {
      cur.count++
      cur.r += r
      cur.g += g
      cur.b += b
    } else {
      buckets.set(key, { count: 1, r, g, b })
    }
    total++
  }
  if (!total) return []
  return [...buckets.values()]
    .sort((x, y) => y.count - x.count)
    .slice(0, n)
    .map(({ count: c, r, g, b }) => ({
      count: c,
      ratio: c / total,
      hex: `#${toHex(r / c)}${toHex(g / c)}${toHex(b / c)}`,
    }))
}
