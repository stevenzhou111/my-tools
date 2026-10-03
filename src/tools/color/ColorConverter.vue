<script setup>
import { computed, ref } from 'vue'
import { useCopy } from '@/utils/useCopy'
import { useUrlState } from '@/utils/urlState'

const input = ref('#6366f1')
// 状态同步到地址栏:复制链接即可分享当前颜色
useUrlState([
  { key: 'q', ref: input, parse: (s) => (/^#?[0-9a-fA-F]{3,8}$/.test(s) ? (s.startsWith('#') ? s : '#' + s) : undefined) },
])
const { copiedKey, copy } = useCopy()

function clamp(v) {
  return Math.min(255, Math.max(0, Math.round(v)))
}

function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
    a: 1,
  }
}

function rgbToHex({ r, g, b }) {
  return (
    '#' +
    [r, g, b]
      .map((v) => clamp(v).toString(16).padStart(2, '0'))
      .join('')
  )
}

function rgbToHsl(r, g, b) {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h /= 6
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

function hslToRgb(h, s, l) {
  h = (((h % 360) + 360) % 360) / 360
  s = Math.min(1, Math.max(0, s))
  l = Math.min(1, Math.max(0, l))
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const f = (t) => {
    t = ((t % 1) + 1) % 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  return {
    r: Math.round(f(h + 1 / 3) * 255),
    g: Math.round(f(h) * 255),
    b: Math.round(f(h - 1 / 3) * 255),
  }
}

function parseColor(str) {
  const s = str.trim().toLowerCase()
  let m
  if ((m = s.match(/^#?([0-9a-f]{3})$/))) return hexToRgb(m[1].split('').map((c) => c + c).join(''))
  if ((m = s.match(/^#?([0-9a-f]{4})$/))) {
    const [r, g, b, a] = m[1].split('').map((c) => parseInt(c + c, 16))
    return { r, g, b, a: +(a / 255).toFixed(3) }
  }
  if ((m = s.match(/^#?([0-9a-f]{6})$/))) return hexToRgb(m[1])
  if ((m = s.match(/^#?([0-9a-f]{8})$/))) {
    const rgbPart = hexToRgb(m[1].slice(0, 6))
    return { ...rgbPart, a: +(parseInt(m[1].slice(6, 8), 16) / 255).toFixed(3) }
  }
  if (
    (m = s.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*([\d.]+)\s*)?\)$/))
  ) {
    return { r: clamp(+m[1]), g: clamp(+m[2]), b: clamp(+m[3]), a: m[4] != null ? +m[4] : 1 }
  }
  if (
    (m = s.match(
      /^hsla?\(\s*(-?[\d.]+)(?:deg)?\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(?:,\s*([\d.]+)\s*)?\)$/,
    ))
  ) {
    return { ...hslToRgb(+m[1], +m[2] / 100, +m[3] / 100), a: m[4] != null ? +m[4] : 1 }
  }
  return null
}

const parsed = computed(() => parseColor(input.value))

const outputs = computed(() => {
  const c = parsed.value
  if (!c) return []
  const hsl = rgbToHsl(c.r, c.g, c.b)
  const hexAlpha = c.a != null && c.a !== 1 ? Math.round(c.a * 255).toString(16).padStart(2, '0') : ''
  const hslAlpha = c.a != null && c.a !== 1 ? ` / ${c.a}` : ''
  return [
    { key: 'hex', label: 'HEX', value: rgbToHex(c) + hexAlpha },
    { key: 'rgb', label: 'RGB', value: `rgb(${c.r}, ${c.g}, ${c.b})` },
    { key: 'rgba', label: 'RGBA', value: `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a})` },
    { key: 'hsl', label: 'HSL', value: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%${hslAlpha})` },
  ]
})

const swatchStyle = computed(() => {
  const c = parsed.value
  if (!c) return { background: 'var(--bg-soft)' }
  return { background: `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a})` }
})
</script>

<template>
  <div class="row" style="margin-bottom: 16px">
    <div class="field" style="flex: 1; margin: 0; min-width: 240px">
      <label class="field-label">输入任意颜色值</label>
      <input
        v-model="input"
        class="input"
        placeholder="支持 #ff6600 / rgb(99,102,241) / hsl(239,84%,67%)"
        spellcheck="false"
      />
    </div>
    <div class="swatch" :style="swatchStyle"></div>
  </div>

  <div v-if="!parsed" class="error-box">✗ 无法识别的颜色格式,试试 #6366f1 或 rgb(99, 102, 241)</div>

  <div v-else class="color-grid">
    <div v-for="o in outputs" :key="o.key" class="panel color-row">
      <div class="color-head">
        <span class="color-label">{{ o.label }}</span>
        <button class="btn btn-sm" @click="copy(o.key, o.value)">
          {{ copiedKey === o.key ? '✓ 已复制' : '复制' }}
        </button>
      </div>
      <code class="color-value">{{ o.value }}</code>
    </div>
  </div>
</template>

<style scoped>
.swatch {
  width: 86px;
  height: 66px;
  border-radius: 10px;
  border: 1px solid var(--border);
  align-self: end;
  flex-shrink: 0;
}
.color-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
@media (max-width: 720px) {
  .color-grid {
    grid-template-columns: 1fr;
  }
}
.color-row {
  padding: 12px;
}
.color-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.color-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--muted);
}
.color-value {
  font-size: 15px;
  word-break: break-all;
}
</style>
