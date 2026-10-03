// 从 favicon.svg 的几何生成 pwa-192/pwa-512 PNG。
// 不走浏览器 canvas:canvas 的渐变渲染带抖动噪点,PNG 压不下去(512px 要 200KB+);
// 这里按解析几何渲染(无噪点)+ 手写 PNG 编码,输出约 30KB。
import fs from 'node:fs'
import zlib from 'node:zlib'

const GRAD_FROM = [0x63, 0x66, 0xf1]
const GRAD_TO = [0x8b, 0x5c, 0xf6]

// ---------- 几何(100×100 viewBox,与 public/favicon.svg 保持一致) ----------
const CARD = { x: 0, y: 0, w: 100, h: 100, r: 22 }
const GRID = { scale: 2.2, dx: 23.6, dy: 23.6, rects: [[3, 3, 7, 7], [14, 3, 7, 7], [14, 14, 7, 7], [3, 14, 7, 7]], stroke: 2, radius: 1 }

function insideRoundRect(px, py, { x, y, w, h, r }) {
  const cx = Math.max(x + r, Math.min(px, x + w - r))
  const cy = Math.max(y + r, Math.min(py, y + h - r))
  const dx = px - cx
  const dy = py - cy
  // 圆角区:到圆心距离;直角区:dx/dy 为 0,等价于轴对齐包含测试
  if (dx === 0 && dy === 0) return px >= x && px <= x + w && py >= y && py <= y + h
  return dx * dx + dy * dy <= r * r
}

// 像素 (px,py) 落在描边环上 = 在外圈圆角矩形内,但不在内缩 stroke 后的矩形内
function insideStroke(px, py, rect) {
  const s = GRID.scale
  const [rx, ry, rw, rh] = rect
  const outer = { x: GRID.dx + rx * s, y: GRID.dy + ry * s, w: rw * s, h: rh * s, r: GRID.radius * s }
  const inset = GRID.stroke * s
  const inner = { x: outer.x + inset, y: outer.y + inset, w: outer.w - inset * 2, h: outer.h - inset * 2, r: Math.max(0, outer.r - inset) }
  return insideRoundRect(px, py, outer) && !insideRoundRect(px, py, inner)
}

// ---------- 4×4 超采样抗锯齿 ----------
function renderPixel(px, py, size) {
  const k = size / 100
  let white = 0
  let card = 0
  const N = 4
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const sx = px + (i + 0.5) / N
      const sy = py + (j + 0.5) / N
      const ux = sx / k
      const uy = sy / k
      if (!insideRoundRect(ux, uy, CARD)) continue
      card++
      if (GRID.rects.some((r) => insideStroke(ux, uy, r))) white++
    }
  }
  const total = N * N
  const a = card / total
  if (a === 0) return [0, 0, 0, 0]
  const t = (px / size + py / size) / 2 // 与 SVG 的 135° 线性渐变一致
  const base = GRAD_FROM.map((c, i) => Math.round(c + (GRAD_TO[i] - c) * t))
  const w = white / total
  const rgb = base.map((c) => Math.round(c + (255 - c) * w))
  return [...rgb, Math.round(a * 255)]
}

// ---------- 最小 PNG 编码(color type 6,RGBA) ----------
function crc32(buf) {
  let table = crc32.table
  if (!table) {
    table = crc32.table = new Int32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      table[n] = c
    }
  }
  let c = -1
  for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  // 每行前置 filter 字节。渐变逐行变化缓慢,用 Up(2) 滤波压缩率最好;首行用 None(0)
  const stride = size * 4
  const raw = Buffer.alloc((stride + 1) * size)
  for (let y = 0; y < size; y++) {
    const rowStart = y * (stride + 1)
    raw[rowStart] = y === 0 ? 0 : 2
    for (let x = 0; x < stride; x++) {
      raw[rowStart + 1 + x] = y === 0 ? rgba[y * stride + x] : (rgba[y * stride + x] - rgba[(y - 1) * stride + x]) & 0xff
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

for (const size of [512, 192]) {
  const rgba = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = renderPixel(x, y, size)
      const o = (y * size + x) * 4
      rgba[o] = r
      rgba[o + 1] = g
      rgba[o + 2] = b
      rgba[o + 3] = a
    }
  }
  const png = encodePng(size, rgba)
  const out = `public/pwa-${size}.png`
  fs.writeFileSync(out, png)
  console.log(`${out}: ${Math.round(png.length / 1024)}KB`)
}