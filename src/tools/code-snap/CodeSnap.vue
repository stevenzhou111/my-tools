<script setup>
import AppIcon from '@/components/AppIcon.vue'
import { computed, ref } from 'vue'
import { highlight } from '@/utils/codeHighlight'
import { downloadCanvas } from '@/utils/image'

const code = ref(`function debounce(fn, wait = 300) {
  let timer
  const debounced = (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), wait)
  }
  // 附带 cancel(),供组件卸载时清理
  debounced.cancel = () => clearTimeout(timer)
  return debounced
}`)
const title = ref('debounce.js')
const theme = ref('dark')
const accent = ref('#6366f1')
const canvasEl = ref(null)

const THEMES = {
  dark: { bg1: '#1e2233', bg2: '#171a26', code: '#e5e7eb', line: '#4b5563' },
  light: { bg1: '#f8fafc', bg2: '#eef1f7', code: '#24292f', line: '#9aa2b1' },
}

// 行号栏与代码正文统一按此宽度排版;字符宽度按 0.6em 估算
const LH = 22
const FS = 14
const PAD = 28

const lines = computed(() => code.value.split('\n').slice(0, 300))

function render() {
  const canvas = canvasEl.value
  if (!canvas) return
  const t = THEMES[theme.value]
  const ctx = canvas.getContext('2d')
  const gutterW = PAD + String(lines.value.length).length * FS * 0.6
  const maxLen = Math.max(...lines.value.map((l) => l.length), 20)
  const W = Math.ceil(gutterW + maxLen * FS * 0.6 + PAD * 2)
  const H = PAD * 2 + 44 + lines.value.length * LH
  const scale = 2
  canvas.width = W * scale
  canvas.height = H * scale
  canvas.style.width = W + 'px'
  ctx.scale(scale, scale)

  // 圆角底 + 双色渐变
  const grad = ctx.createLinearGradient(0, 0, W, H)
  grad.addColorStop(0, accent.value)
  grad.addColorStop(1, shade(accent.value, -30))
  ctx.fillStyle = grad
  roundRect(ctx, 0, 0, W, H, 18)
  ctx.fill()

  // 内部"窗口"
  ctx.fillStyle = t.bg1
  roundRect(ctx, 12, 12, W - 24, H - 24, 12)
  ctx.fill()
  // 顶栏
  ctx.fillStyle = t.bg2
  roundRect(ctx, 12, 12, W - 24, 34, { tl: 12, tr: 12, bl: 0, br: 0 })
  ctx.fill()
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = ['#ff5f57', '#febc2e', '#28c840'][i]
    ctx.beginPath()
    ctx.arc(32 + i * 18, 29, 5.5, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = t.line
  ctx.font = `12px system-ui`
  ctx.textBaseline = 'middle'
  ctx.fillText(title.value || 'untitled', 80, 30)

  ctx.font = `${FS}px ui-monospace, Consolas, monospace`
  lines.value.forEach((line, i) => {
    const y = 44 + PAD / 2 + i * LH + LH / 2
    ctx.fillStyle = t.line
    ctx.fillText(String(i + 1), PAD - 4, y)
    let x = gutterW
    for (const tok of highlight(line)) {
      ctx.fillStyle = TOKEN_COLORS[t.cls] ?? t.code
      ctx.fillText(tok.text, x, y)
      x += tok.text.length * FS * 0.6
    }
  })
}

const TOKEN_COLORS = {
  keyword: '#c792ea',
  string: '#a5d6a7',
  comment: '#7f8c98',
  number: '#f78c6c',
  builtin: '#82aaff',
}

function shade(hex, pct) {
  const n = parseInt(hex.slice(1), 16)
  const f = (v) => Math.max(0, Math.min(255, v + Math.round(2.55 * pct)))
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = typeof r === 'number' ? { tl: r, tr: r, bl: r, br: r } : r
  ctx.beginPath()
  ctx.moveTo(x + rr.tl, y)
  ctx.lineTo(x + w - rr.tr, y)
  ctx.arcTo(x + w, y, x + w, y + rr.tr, rr.tr)
  ctx.lineTo(x + w, y + h - rr.br)
  ctx.arcTo(x + w, y + h, x + w - rr.br, y + h, rr.br)
  ctx.lineTo(x + rr.bl, y + h)
  ctx.arcTo(x, y + h, x, y + h - rr.bl, rr.bl)
  ctx.lineTo(x, y + rr.tl)
  ctx.arcTo(x, y, x + rr.tl, y, rr.tl)
  ctx.closePath()
}

function download() {
  downloadCanvas(canvasEl.value, (title.value || 'code').replace(/\.\w+$/, '') + '-snap.png', 'image/png')
}
</script>

<template>
  <p class="tip" style="margin-bottom: 14px">
    把代码变成一张适合分享的美图:渐变底、窗口外观、行号与语法高亮,渲染全部在本地 Canvas 完成。支持 JS/TS/JSON/Python/HTML/CSS 等常见语法的高亮近似。
  </p>

  <div class="row" style="margin-bottom: 12px; flex-wrap: wrap">
    <label class="ctrl">
      <span class="field-label" for="cs-title">文件名</span>
      <input id="cs-title" v-model="title" class="input" style="width: 160px" spellcheck="false" @input="render" />
    </label>
    <label class="ctrl">
      <span class="field-label" for="cs-theme">主题</span>
      <select id="cs-theme" v-model="theme" class="select" style="width: 110px" @change="render">
        <option value="dark">深色</option>
        <option value="light">浅色</option>
      </select>
    </label>
    <label class="ctrl">
      <span class="field-label">渐变主色</span>
      <input v-model="accent" type="color" class="input color-input" style="width: 46px" aria-label="渐变主色" @input="render" />
    </label>
  </div>

  <div class="field">
    <label class="field-label" for="cs-code">代码(最多 300 行)</label>
    <textarea id="cs-code" v-model="code" class="textarea" style="min-height: 220px; font-family: var(--mono); font-size: 13px" spellcheck="false" @input="render"></textarea>
  </div>

  <div class="panel snap-panel mt-12">
    <canvas ref="canvasEl" class="snap-canvas" role="img" aria-label="代码截图预览"></canvas>
  </div>
  <div class="row mt-10">
    <button class="btn btn-primary" @click="render"><AppIcon name="refresh-cw" :size="15" /> 重新渲染</button>
    <button class="btn btn-primary" @click="download">⬇️ 下载 PNG(2x)</button>
  </div>
</template>

<style scoped>
.color-input {
  padding: 2px;
  cursor: pointer;
}
.snap-panel {
  overflow: auto;
  text-align: center;
  padding: 14px;
}
.snap-canvas {
  max-width: 100%;
  border-radius: 10px;
}
</style>
