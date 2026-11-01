<script setup>
import { computed, ref, watch } from 'vue'
import { tokenize, layoutCloud } from '@/utils/wordCloud'
import { useCopy } from '@/utils/useCopy'
import { useUrlState } from '@/utils/urlState'
import AppIcon from '@/components/AppIcon.vue'

const SAMPLE = `盘古之白 是 中文 排版 惯例 在 中文 与 英文 数字 之间 加 空格
盘古之白 让 文字 有了 呼吸感 排版 更 精致 中文 工具箱 里 的 常用 功能
排版 格式化 一键 处理 长文 盘古之白 呼吸感 文字 精致 惯例 中文 排版`

const mode = ref('word') // word = 英文单词, char = 中文字符
const input = ref('')
const maxWords = ref(80)
const width = ref(900)
const height = ref(480)
const palette = ref('indigo')

const { copiedKey, copy } = useCopy()

const PALETTES = [
  { id: 'indigo', label: '靛蓝', colors: ['#6366f1', '#8b5cf6', '#4f46e5', '#a78bfa', '#312e81', '#0ea5e9'] },
  { id: 'sunset', label: '日落', colors: ['#f97316', '#ef4444', '#e11d48', '#f59e0b', '#be123c', '#7c2d12'] },
  { id: 'forest', label: '森林', colors: ['#16a34a', '#059669', '#65a30d', '#0d9488', '#14532d', '#84cc16'] },
  { id: 'mono', label: '墨色', colors: ['#1c2130', '#475569', '#64748b', '#334155', '#94a3b8', '#0f172a'] },
]

useUrlState([
  { key: 'm', ref: mode, parse: (s) => (['word', 'char'].includes(s) ? s : undefined) },
  { key: 'n', ref: maxWords, parse: (s) => { const v = Number(s); return Number.isFinite(v) && v >= 10 && v <= 200 ? v : undefined } },
  { key: 'w', ref: width, parse: (s) => { const v = Number(s); return Number.isFinite(v) && v >= 320 && v <= 2400 ? v : undefined } },
  { key: 'h', ref: height, parse: (s) => { const v = Number(s); return Number.isFinite(v) && v >= 240 && v <= 1600 ? v : undefined } },
  { key: 'p', ref: palette, parse: (s) => (PALETTES.some((p) => p.id === s) ? s : undefined) },
])

const tokens = computed(() => tokenize(input.value, { mode: mode.value, max: maxWords.value }))

const layout = computed(() => {
  if (!tokens.value.items.length) return { placed: [], skipped: 0 }
  return layoutCloud(tokens.value, { width: width.value, height: height.value })
})

const colors = computed(() => PALETTES.find((p) => p.id === palette.value)?.colors || PALETTES[0].colors)

const canvas = ref(null)

function render() {
  const el = canvas.value
  if (!el) return
  const dpr = 2 // 导出即 2x
  el.width = width.value * dpr
  el.height = height.value * dpr
  el.style.width = `${width.value}px`
  el.style.height = `${height.value}px`
  const ctx = el.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, width.value, height.value)

  layout.value.placed.forEach((p, i) => {
    ctx.save()
    ctx.translate(p.x, p.y)
    if (p.rotate === 90) ctx.rotate(Math.PI / 2)
    ctx.fillStyle = colors.value[i % colors.value.length]
    ctx.font = `${p.size >= 40 ? 700 : 500} ${p.size}px system-ui, 'PingFang SC', 'Microsoft YaHei', sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(p.text, 0, 0)
    ctx.restore()
  })
}

watch([tokens, width, height, palette, canvas], render, { immediate: true })

function download() {
  if (!canvas.value || !layout.value.placed.length) return
  canvas.value.toBlob((blob) => {
    if (!blob) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'wordcloud.png'
    a.click()
    URL.revokeObjectURL(a.href)
  }, 'image/png')
}

function loadSample() {
  input.value = SAMPLE
}

function onFileChange(e) {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    input.value = String(reader.result || '')
  }
  reader.readAsText(file)
  e.target.value = ''
}
</script>

<template>
  <div class="panel mb-16">
    <div class="row mode-row">
      <div class="row gap-8" role="radiogroup" aria-label="统计口径">
        <button class="btn btn-sm" :class="{ 'btn-primary': mode === 'word' }" role="radio" :aria-checked="mode === 'word'" @click="mode = 'word'">
          英文单词
        </button>
        <button class="btn btn-sm" :class="{ 'btn-primary': mode === 'char' }" role="radio" :aria-checked="mode === 'char'" @click="mode = 'char'">
          中文单字
        </button>
      </div>
      <label class="ctrl-inline">
        <span class="tip">最多词数:</span>
        <input v-model.number="maxWords" class="input num-input" type="number" min="10" max="200" />
      </label>
      <label class="ctrl-inline">
        <span class="tip">配色:</span>
        <select v-model="palette" class="select" aria-label="配色方案">
          <option v-for="p in PALETTES" :key="p.id" :value="p.id">{{ p.label }}</option>
        </select>
      </label>
    </div>
  </div>

  <div class="panel mb-16">
    <div class="label-row">
      <label class="field-label" for="wordcloud-input">粘贴文本(词云只统计词频,长文取前 {{ maxWords }} 名)</label>
      <span class="row gap-8">
        <label class="btn btn-sm file-btn">
          <AppIcon name="folder-open" :size="14" />载入文件
          <input type="file" accept=".txt,.md,text/*" class="sr-only" @change="onFileChange" />
        </label>
        <button class="btn btn-sm" @click="loadSample">示例</button>
        <button class="btn btn-sm" :disabled="!input" @click="input = ''">清空</button>
      </span>
    </div>
    <textarea
      id="wordcloud-input"
      v-model="input"
      v-draft="'word-cloud-input'"
      class="textarea src-area"
      spellcheck="false"
      placeholder="粘贴一段文字或载入 .txt/.md 文件…"
    ></textarea>
    <p v-if="input" class="tip m-0 mt-8">
      共统计 {{ tokens.total }} 个词,取前 {{ tokens.items.length }} 名绘制
      <template v-if="layout.skipped">;画布放不下 {{ layout.skipped }} 个小词,已自动省略</template>
    </p>
  </div>

  <div class="panel preview-panel mb-16">
    <canvas v-if="input" ref="canvas" class="preview-canvas" role="img" aria-label="词云图预览"></canvas>
    <div v-else class="empty-hint">
      <p class="m-0 tip">贴入文本后这里会出现词云图</p>
      <p class="m-0 tip">高频词更大更醒目,支持导出 2x 高清 PNG</p>
    </div>
  </div>

  <div v-if="input && layout.placed.length" class="row export-row">
    <button class="btn btn-primary" @click="download">下载 PNG(2x)</button>
    <button class="btn" @click="copy('wordcloud-top', tokens.items.slice(0, 20).map((it) => `${it.text} ×${it.count}`).join('\n'))">
      <AppIcon :name="copiedKey === 'wordcloud-top' ? 'check' : 'clipboard'" :size="14" />{{ copiedKey === 'wordcloud-top' ? '已复制' : '复制 Top20 词表' }}
    </button>
    <span class="tip">本地 Canvas 绘制,无水印</span>
  </div>

  <div class="panel mt-16">
    <p class="tip m-0">
      英文按单词统计(自动去 the / and 等虚词),中文在「英文单词」模式下按字面词切分、在「中文单字」模式下逐字统计——中文分词需要词典,纯浏览器环境无法准确分词,这是本工具与分词引擎的差别。
      需要看完整词频表(含词数、占比、可导出)请用「词频统计」。
    </p>
  </div>
</template>

<style scoped>
.mode-row {
  gap: 18px;
  align-items: center;
  flex-wrap: wrap;
}
.ctrl-inline {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.num-input {
  width: 90px;
  font-family: var(--mono);
}
.label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}
.file-btn {
  position: relative;
  overflow: hidden;
}
.src-area {
  min-height: 130px;
  font-size: 14px;
}
.preview-panel {
  display: grid;
  place-items: center;
  min-height: 320px;
  padding: 16px;
}
.preview-canvas {
  max-width: 100%;
  height: auto !important;
}
.empty-hint {
  text-align: center;
  padding: 60px 0;
}
.empty-hint p {
  margin-bottom: 6px;
}
.export-row {
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}
</style>
