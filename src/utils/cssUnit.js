/**
 * CSS 常用单位换算与纸张 @DPI 像素计算。
 * 换算基准遵循 CSS 规范:1in = 96px,1pt = 4/3px,1pc = 16px。
 */

export const CSS_UNITS = [
  { id: 'px', label: 'px', group: '绝对长度', note: 'CSS 像素' },
  { id: 'pt', label: 'pt', group: '绝对长度', note: '1pt = 4/3px' },
  { id: 'pc', label: 'pc', group: '绝对长度', note: '1pc = 12pt = 16px' },
  { id: 'in', label: 'in', group: '绝对长度', note: '1in = 96px' },
  { id: 'cm', label: 'cm', group: '绝对长度', note: '1cm = 96/2.54px' },
  { id: 'mm', label: 'mm', group: '绝对长度', note: '1mm = 96/25.4px' },
  { id: 'rem', label: 'rem', group: '相对长度', note: '相对根字号' },
  { id: 'em', label: 'em', group: '相对长度', note: '相对父字号' },
  { id: '%', label: '%', group: '相对长度', note: '相对父字号' },
  { id: 'vw', label: 'vw', group: '视口单位', note: '视口宽度的 1%' },
  { id: 'vh', label: 'vh', group: '视口单位', note: '视口高度的 1%' },
  { id: 'vmin', label: 'vmin', group: '视口单位', note: '视口短边的 1%' },
  { id: 'vmax', label: 'vmax', group: '视口单位', note: '视口长边的 1%' },
]

export const CSS_UNIT_IDS = CSS_UNITS.map((u) => u.id)

export const PAPER_PRESETS = [
  { id: 'a4', name: 'A4(210 × 297mm)', w: 210, h: 297 },
  { id: 'a4l', name: 'A4 横向(297 × 210mm)', w: 297, h: 210 },
  { id: 'a3', name: 'A3(297 × 420mm)', w: 297, h: 420 },
  { id: 'a5', name: 'A5(148 × 210mm)', w: 148, h: 210 },
  { id: 'letter', name: 'Letter(215.9 × 279.4mm)', w: 215.9, h: 279.4 },
]

export const PAPER_DPIS = [72, 96, 150, 300]

const DEFAULTS = { root: 16, parent: 16, viewportWidth: 1280, viewportHeight: 800 }

function pick(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function readOptions(options = {}) {
  return {
    root: pick(options.root, DEFAULTS.root),
    parent: pick(options.parent, DEFAULTS.parent),
    viewportWidth: pick(options.viewportWidth, DEFAULTS.viewportWidth),
    viewportHeight: pick(options.viewportHeight, DEFAULTS.viewportHeight),
  }
}

export function toPx(value, unit, options = {}) {
  const n = Number(value)
  if (!Number.isFinite(n)) return NaN
  const o = readOptions(options)
  switch (unit) {
    case 'px': return n
    case 'pt': return (n * 96) / 72
    case 'pc': return n * 16
    case 'in': return n * 96
    case 'cm': return (n * 96) / 2.54
    case 'mm': return (n * 96) / 25.4
    case 'rem': return n * o.root
    case 'em': return n * o.parent
    case '%': return (n * o.parent) / 100
    case 'vw': return (n * o.viewportWidth) / 100
    case 'vh': return (n * o.viewportHeight) / 100
    case 'vmin': return (n * Math.min(o.viewportWidth, o.viewportHeight)) / 100
    case 'vmax': return (n * Math.max(o.viewportWidth, o.viewportHeight)) / 100
    default: return NaN
  }
}

export function fromPx(px, unit, options = {}) {
  if (!Number.isFinite(px)) return NaN
  const o = readOptions(options)
  switch (unit) {
    case 'px': return px
    case 'pt': return (px * 72) / 96
    case 'pc': return px / 16
    case 'in': return px / 96
    case 'cm': return (px * 2.54) / 96
    case 'mm': return (px * 25.4) / 96
    case 'rem': return px / o.root
    case 'em': return px / o.parent
    case '%': return (px / o.parent) * 100
    case 'vw': return (px / o.viewportWidth) * 100
    case 'vh': return (px / o.viewportHeight) * 100
    case 'vmin': return (px / Math.min(o.viewportWidth, o.viewportHeight)) * 100
    case 'vmax': return (px / Math.max(o.viewportWidth, o.viewportHeight)) * 100
    default: return NaN
  }
}

/** 一次换算到全部单位;输入非法或上下文尺寸为 0 时返回 error。 */
export function convertCss(value, unit, options = {}) {
  if (value === '' || value === null || value === undefined) {
    return { px: NaN, rows: [], error: '请输入要换算的数值' }
  }
  if (!CSS_UNIT_IDS.includes(unit)) {
    return { px: NaN, rows: [], error: '请选择有效的单位' }
  }
  const o = readOptions(options)
  if (!(o.root > 0) || !(o.parent > 0) || !(o.viewportWidth > 0) || !(o.viewportHeight > 0)) {
    return { px: NaN, rows: [], error: '根字号、父字号与视口尺寸都必须大于 0' }
  }
  const px = toPx(value, unit, o)
  if (!Number.isFinite(px)) {
    return { px: NaN, rows: [], error: '请输入有效数字' }
  }
  return {
    px,
    rows: CSS_UNITS.map((u) => ({ ...u, value: fromPx(px, u.id, o) })),
    error: '',
  }
}

/** 展示用格式化:保留 4 位小数并去掉末尾 0,极端值用科学计数法。 */
export function formatCssNumber(n) {
  if (!Number.isFinite(n)) return '—'
  if (n === 0) return '0'
  const abs = Math.abs(n)
  if (abs >= 1e9 || abs < 1e-4) return n.toExponential(4)
  return String(Math.round(n * 1e4) / 1e4)
}

export function paperPixels(mmWidth, mmHeight, dpi) {
  const w = Number(mmWidth)
  const h = Number(mmHeight)
  const d = Number(dpi)
  if (!(w > 0) || !(h > 0) || !(d > 0)) return { dpi: d, width: 0, height: 0, megapixels: 0 }
  const width = Math.round((w / 25.4) * d)
  const height = Math.round((h / 25.4) * d)
  return { dpi: d, width, height, megapixels: (width * height) / 1e6 }
}

export function paperRows(mmWidth, mmHeight, dpis = PAPER_DPIS) {
  return dpis.map((dpi) => paperPixels(mmWidth, mmHeight, dpi))
}