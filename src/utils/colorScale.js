/**
 * 色阶生成:把一个主色推成 50~950 的完整色阶(Tailwind 风格 11 档)。
 * 思路:保持色相与饱和度基本不变,按固定明度锚点向两端推亮/推暗,
 * 输入色归一化为 500 档(明度钳制在 30%~62% 之间,保证两端仍有余量)。
 */

/** '#rgb' / '#rrggbb' → {h(0-360), s(0-100), l(0-100)},非法输入返回 null */
export function hexToHsl(hex) {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex).trim())
  if (!m) return null
  let h = m[1]
  if (h.length === 3) h = [...h].map((c) => c + c).join('')
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  let s = 0
  let hue = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) hue = ((g - b) / d + (g < b ? 6 : 0)) * 60
    else if (max === g) hue = ((b - r) / d + 2) * 60
    else hue = ((r - g) / d + 4) * 60
  }
  return { h: Math.round(hue), s: Math.round(s * 100), l: Math.round(l * 100) }
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

function hueToRgb(p, q, t) {
  let x = t
  if (x < 0) x += 1
  if (x > 1) x -= 1
  if (x < 1 / 6) return p + (q - p) * 6 * x
  if (x < 1 / 2) return q
  if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6
  return p
}

/** h(0-360) s(0-100) l(0-100) → '#rrggbb'(小写) */
export function hslToHex(h, s, l) {
  const H = ((Number(h) % 360) + 360) % 360
  const S = clamp(Number(s), 0, 100) / 100
  const L = clamp(Number(l), 0, 100) / 100
  if (S === 0) {
    const v = Math.round(L * 255)
    const hx = v.toString(16).padStart(2, '0')
    return `#${hx}${hx}${hx}`
  }
  const q = L < 0.5 ? L * (1 + S) : L + S - L * S
  const p = 2 * L - q
  const to = (t) => Math.round(hueToRgb(p, q, t) * 255)
    .toString(16)
    .padStart(2, '0')
  return `#${to(H / 360 + 1 / 3)}${to(H / 360)}${to(H / 360 - 1 / 3)}`
}

// 各档明度锚点(%):50 最亮 → 950 最暗;500 档由输入色归一化决定
const L_ANCHORS = [97, 94, 86, 77, 66, null, 44, 36, 28, 21, 15]
export const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]

/** 生成 11 档色阶:[{ step, hex, isBase }] */
export function buildScale(hex) {
  const hsl = hexToHsl(hex)
  if (!hsl) return null
  const l500 = clamp(hsl.l, 30, 62)
  return STEPS.map((step, i) => {
    const l = step === 500 ? l500 : L_ANCHORS[i]
    // 极亮/极暗两端的饱和度略收敛,避免高光发荧光、暗部发紫
    let s = hsl.s
    if (step <= 100) s *= 0.92
    if (step >= 900) s = Math.min(100, s * 1.04)
    return { step, hex: hslToHex(hsl.h, s, l), isBase: step === 500 }
  })
}

/** 该色上白字还是黑字更清晰:相对亮度 > 0.55 用黑字 */
export function readableOn(hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!m) return '#000'
  const n = parseInt(m[1], 16)
  const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 0xff) + 0.114 * (n & 0xff)) / 255
  return lum > 0.55 ? '#1c2130' : '#ffffff'
}

/** 输出 Tailwind 风格配置片段 */
export function toTailwind(scale, name = 'primary') {
  return `${name}: {\n` + scale.map((c) => `  '${c.step}': '${c.hex}',`).join('\n') + `\n}`
}

/** 输出 CSS 变量片段 */
export function toCssVars(scale, name = 'brand') {
  return `:root {\n` + scale.map((c) => `  --${name}-${c.step}: ${c.hex};`).join('\n') + `\n}`
}
