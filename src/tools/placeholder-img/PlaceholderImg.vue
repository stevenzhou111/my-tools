<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { parseHex, relativeLuminance } from '@/utils/contrast'
import { useUrlState } from '@/utils/urlState'

const PRESETS = [
  { w: 1200, h: 630, label: 'OG 分享图' },
  { w: 1920, h: 1080, label: '16:9 桌面' },
  { w: 1080, h: 1080, label: '方图 1:1' },
  { w: 750, h: 1334, label: '手机屏 9:16' },
  { w: 800, h: 600, label: '4:3 通用' },
  { w: 160, h: 90, label: '小图标' },
]

const BG_SWATCHES = ['#e2e8f0', '#c7d2fe', '#bbf7d0', '#fde68a', '#fecaca', '#1e293b']
const TEXT_SWATCHES = ['#64748b', '#4338ca', '#166534', '#92400e', '#991b1b', '#f1f5f9']

const width = ref(1200)
const height = ref(630)
const bg = ref('#c7d2fe')
const fg = ref('#4338ca')
const label = ref('')
const radius = ref(0)
const showSize = ref(true)
const format = ref('png')
let resultUrl = ''

function download() {
  canvas.value.toBlob((blob) => {
    if (!blob) return
    if (resultUrl) URL.revokeObjectURL(resultUrl)
    resultUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = resultUrl
    a.download = `placeholder-${width.value}x${height.value}.${format.value === 'jpeg' ? 'jpg' : format.value}`
    a.click()
  }, format.value === 'jpeg' ? 'image/jpeg' : format.value === 'webp' ? 'image/webp' : 'image/png', format.value === 'jpeg' ? 0.92 : undefined)
}

onUnmounted(() => {
  if (resultUrl) URL.revokeObjectURL(resultUrl)
})

const num = (lo, hi) => (s) => {
  const v = Number(s)
  return Number.isFinite(v) && v >= lo && v <= hi ? v : undefined
}
useUrlState([
  { key: 'w', ref: width, parse: num(16, 4096) },
  { key: 'h', ref: height, parse: num(16, 4096) },
  { key: 'bg', ref: bg, parse: (s) => (/^#[0-9a-fA-F]{6}$/.test(s) ? s : undefined) },
  { key: 'fg', ref: fg, parse: (s) => (/^#[0-9a-fA-F]{6}$/.test(s) ? s : undefined) },
  { key: 't', ref: label, parse: (s) => (s.length <= 60 ? s : undefined) },
])

const displayText = computed(() => {
  const t = label.value.trim()
  return t || `${width.value} × ${height.value}`
})

// 深浅自适应:用户自选文字色仍以可读性兜底提示
const fgTooClose = computed(() => {
  try {
    const a = relativeLuminance(parseHex(bg.value))
    const b = relativeLuminance(parseHex(fg.value))
    return Math.abs(a - b) < 0.18
  } catch {
    return false
  }
})

const canvas = ref(null)

function render() {
  const el = canvas.value
  if (!el) return
  const ctx = el.getContext('2d')
  const w = Math.min(width.value, 4096)
  const h = Math.min(height.value, 4096)
  el.width = w
  el.height = h
  ctx.clearRect(0, 0, w, h)
  if (radius.value > 0) {
    const r = Math.min(radius.value, w / 2, h / 2)
    roundRect(ctx, w, h, r)
    ctx.clip()
  }
  ctx.fillStyle = bg.value
  ctx.fillRect(0, 0, w, h)

  // 参考网格线(居中十字),帮助判断构图
  ctx.strokeStyle = fg.value
  ctx.globalAlpha = 0.14
  ctx.lineWidth = Math.max(1, Math.round(w / 800))
  ctx.beginPath()
  ctx.moveTo(w / 2, 0)
  ctx.lineTo(w / 2, h)
  ctx.moveTo(0, h / 2)
  ctx.lineTo(w, h / 2)
  ctx.stroke()
  ctx.globalAlpha = 1

  const fontSize = Math.max(14, Math.round(Math.min(w, h) / 10))
  ctx.fillStyle = fg.value
  ctx.font = `600 ${fontSize}px system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(displayText.value, w / 2, h / 2)

  if (showSize.value) {
    const sub = Math.max(11, Math.round(fontSize * 0.32))
    ctx.font = `400 ${sub}px system-ui, sans-serif`
    ctx.globalAlpha = 0.75
    ctx.fillText(`placeholder · ${w}×${h}`, w / 2, h / 2 + fontSize * 0.95)
    ctx.globalAlpha = 1
  }

  // 边框
  if (radius.value === 0) {
    ctx.strokeStyle = fg.value
    ctx.globalAlpha = 0.35
    ctx.lineWidth = Math.max(1, Math.round(w / 400))
    ctx.strokeRect(0, 0, w, h)
    ctx.globalAlpha = 1
  }
}

function roundRect(ctx, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(r, 0)
  ctx.arcTo(w, 0, w, h, r)
  ctx.arcTo(w, h, 0, h, r)
  ctx.arcTo(0, h, 0, 0, r)
  ctx.arcTo(0, 0, w, 0, r)
  ctx.closePath()
}

watch([width, height, bg, fg, label, radius, showSize, canvas], render, { immediate: true })
</script>

<template>
  <div class="panel mb-16">
    <div class="row preset-row">
      <span class="tip">常用尺寸:</span>
      <button v-for="p in PRESETS" :key="p.label" class="btn btn-sm" @click="width = p.w; height = p.h">{{ p.label }}</button>
    </div>
    <div class="form-row">
      <label class="ctrl">
        <span class="field-label m-0">宽(px)</span>
        <input v-model.number="width" class="input num-input" type="number" min="16" max="4096" />
      </label>
      <label class="ctrl">
        <span class="field-label m-0">高(px)</span>
        <input v-model.number="height" class="input num-input" type="number" min="16" max="4096" />
      </label>
      <label class="ctrl grow">
        <span class="field-label m-0">文字(留空显示尺寸)</span>
        <input v-model="label" class="input" type="text" maxlength="60" placeholder="如:头图位置" />
      </label>
      <label class="ctrl">
        <span class="field-label m-0">圆角(px)</span>
        <input v-model.number="radius" class="input num-input" type="number" min="0" max="2048" />
      </label>
    </div>
    <div class="row swatch-row">
      <span class="tip">背景:</span>
      <button
        v-for="c in BG_SWATCHES"
        :key="c"
        class="swatch"
        :class="{ on: bg === c }"
        :style="{ background: c }"
        :title="c"
        @click="bg = c"
      ></button>
      <label class="swatch-input"><input v-model="bg" type="color" aria-label="自定义背景色" /></label>
      <span class="tip ml">文字:</span>
      <button
        v-for="c in TEXT_SWATCHES"
        :key="c"
        class="swatch"
        :class="{ on: fg === c }"
        :style="{ background: c }"
        :title="c"
        @click="fg = c"
      ></button>
      <label class="swatch-input"><input v-model="fg" type="color" aria-label="自定义文字色" /></label>
      <label class="check"><input v-model="showSize" type="checkbox" />角标尺寸</label>
    </div>
    <p v-if="fgTooClose" class="tip warn-tip">⚠ 文字色与背景色明度接近,可能看不清;已自动以对比度参考提醒。</p>
  </div>

  <div class="preview-panel panel mb-16">
    <canvas ref="canvas" class="preview-canvas" aria-label="占位图预览"></canvas>
  </div>

  <div class="row export-row">
    <select v-model="format" class="select" aria-label="导出格式">
      <option value="png">PNG(透明支持)</option>
      <option value="jpeg">JPG(体积更小)</option>
      <option value="webp">WebP(现代格式)</option>
    </select>
    <button class="btn btn-primary" @click="download">
      下载图片
    </button>
    <span class="tip">生成完全在本地 Canvas 绘制,可直接用作设计稿与开发占位。</span>
  </div>
</template>

<style scoped>
.preset-row {
  gap: 6px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.form-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-end;
}
.ctrl {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.grow {
  flex: 1;
  min-width: 200px;
}
.num-input {
  width: 110px;
  font-family: var(--mono);
}
.swatch-row {
  margin-top: 14px;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
}
.swatch {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  border: 2px solid var(--border);
  cursor: pointer;
  padding: 0;
}
.swatch.on {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-soft);
}
.swatch-input input {
  width: 34px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--card);
  cursor: pointer;
}
.ml {
  margin-left: 10px;
}
.warn-tip {
  margin-top: 10px;
  color: var(--warning);
}
.preview-panel {
  display: grid;
  place-items: center;
  padding: 18px;
}
.preview-canvas {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  box-shadow: var(--shadow);
}
.export-row {
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}
</style>
