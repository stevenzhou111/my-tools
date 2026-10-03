<script setup>
import { onUnmounted, ref, watch } from 'vue'
import { downloadCanvas, loadImageFromFile } from '@/utils/image'
import { debounce } from '@/utils/format'

const fileInput = ref(null)
const items = ref([]) // { img, w, h, name }
const direction = ref('vertical')
const gap = ref(8)
const padding = ref(0)
const bgColor = ref('#ffffff')
const align = ref('center')
const previewUrl = ref('')
const error = ref('')

function pick() {
  fileInput.value?.click()
}
function onFileChange(e) {
  for (const f of e.target.files || []) add(f)
  e.target.value = ''
}
function onDrop(e) {
  for (const f of e.dataTransfer?.files || []) add(f)
}
async function add(file) {
  error.value = ''
  if (!file.type.startsWith('image/')) return (error.value = `「${file.name}」不是图片文件`)
  try {
    const img = await loadImageFromFile(file)
    items.value.push({ img, w: img.naturalWidth, h: img.naturalHeight, name: file.name })
  } catch (e) {
    error.value = e.message
  }
}
function remove(index) {
  items.value.splice(index, 1)
}
function move(index, delta) {
  const target = index + delta
  if (target < 0 || target >= items.value.length) return
  const arr = items.value
  ;[arr[index], arr[target]] = [arr[target], arr[index]]
  render()
}

function compose() {
  if (!items.value.length) return null
  const gapV = direction.value === 'vertical' ? 0 : gap.value
  const gapH = direction.value === 'vertical' ? gap.value : 0
  const inner =
    direction.value === 'vertical'
      ? { w: Math.max(...items.value.map((i) => i.w)), h: items.value.reduce((n, i) => n + i.h, 0) + gapH * (items.value.length - 1) }
      : { w: items.value.reduce((n, i) => n + i.w, 0) + gapV * (items.value.length - 1), h: Math.max(...items.value.map((i) => i.h)) }
  const width = inner.w + padding.value * 2
  const height = inner.h + padding.value * 2
  // 超出浏览器画布上限时直接报错,避免静默输出空图
  if (width > 16384 || height > 16384) {
    error.value = `拼接结果 ${width} × ${height} 超出浏览器画布上限(16384 px),请减少图片数量或缩小间距`
    return null
  }
  error.value = ''
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = bgColor.value
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  let cursor = padding.value
  for (const it of items.value) {
    if (direction.value === 'vertical') {
      const x = align.value === 'left' ? padding.value : align.value === 'right' ? padding.value + inner.w - it.w : padding.value + (inner.w - it.w) / 2
      ctx.drawImage(it.img, x, cursor)
      cursor += it.h + gapH
    } else {
      const y = align.value === 'left' ? padding.value : align.value === 'right' ? padding.value + inner.h - it.h : padding.value + (inner.h - it.h) / 2
      ctx.drawImage(it.img, cursor, y)
      cursor += it.w + gapV
    }
  }
  return canvas
}

function render() {
  const canvas = compose()
  if (!canvas) {
    previewUrl.value = ''
    return
  }
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  canvas.toBlob((b) => b && (previewUrl.value = URL.createObjectURL(b)), 'image/png')
}

watch([direction, gap, padding, bgColor, align, () => items.value.length], debounce(render, 150))

onUnmounted(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})

function download() {
  const canvas = compose()
  if (canvas) downloadCanvas(canvas, 'merged-' + Date.now() + '.png', 'image/png')
}
</script>

<template>
  <div class="dropzone" @click="pick" @dragover.prevent @drop.prevent="onDrop">
    <input ref="fileInput" type="file" accept="image/*" multiple hidden @change="onFileChange" />
    <div class="dz-icon">🧷</div>
    <p><strong>点击选择多张图片</strong> 或拖拽到此处,按列表顺序拼接</p>
  </div>

  <div v-if="error" class="error-box" style="margin-top: 12px">✗ {{ error }}</div>

  <div v-if="items.length" class="row" style="margin-top: 14px">
    <label class="check"><input v-model="direction" type="radio" value="vertical" />纵向拼接</label>
    <label class="check"><input v-model="direction" type="radio" value="horizontal" />横向拼接</label>
    <label class="ctrl-inline">间距 <strong>{{ gap }}px</strong> <input v-model.number="gap" type="range" min="0" max="60" /></label>
    <label class="ctrl-inline">留白 <strong>{{ padding }}px</strong> <input v-model.number="padding" type="range" min="0" max="60" /></label>
    <label class="ctrl-inline">背景 <input v-model="bgColor" type="color" class="input color-input" /></label>
    <label class="check">
      <select v-model="align" class="select">
        <option value="left">靠左/上对齐</option>
        <option value="center">居中对齐</option>
        <option value="right">靠右/下对齐</option>
      </select>
    </label>
  </div>

  <div v-if="items.length" class="panel" style="margin-top: 14px">
    <label class="field-label">图片顺序({{ items.length }})</label>
    <div v-for="(it, i) in items" :key="i" class="img-row">
      <span class="file-order">{{ i + 1 }}</span>
      <span class="img-meta">{{ it.name }} · {{ it.w }}×{{ it.h }}</span>
      <button class="btn btn-sm" :disabled="i === 0" @click="move(i, -1)">↑</button>
      <button class="btn btn-sm" :disabled="i === items.length - 1" @click="move(i, 1)">↓</button>
      <button class="btn btn-sm" @click="remove(i)">✕</button>
    </div>
  </div>

  <div v-if="previewUrl" class="panel" style="margin-top: 14px">
    <div class="preview-wrap">
      <img :src="previewUrl" class="preview" :class="direction" alt="拼接预览" />
    </div>
    <div class="row" style="margin-top: 12px">
      <button class="btn btn-primary" @click="download">⬇️ 下载拼接长图</button>
    </div>
  </div>
</template>

<style scoped>
.dropzone {
  border: 2px dashed var(--border);
  border-radius: var(--radius);
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  color: var(--muted);
  transition: border-color 0.15s, background 0.15s;
}
.dropzone:hover {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.dz-icon {
  font-size: 40px;
  margin-bottom: 6px;
}
.dropzone p { margin: 4px 0; }
.ctrl-inline {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
}
.color-input {
  width: 46px;
  height: 32px;
  padding: 2px;
}
.img-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px dashed var(--border);
  font-size: 14.5px;
}
.img-row:last-child { border-bottom: none; }
.file-order {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.img-meta {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--muted);
}
.preview-wrap {
  display: flex;
  justify-content: center;
  max-height: 480px;
  overflow: auto;
  background:
    linear-gradient(45deg, var(--bg-soft) 25%, transparent 25%, transparent 75%, var(--bg-soft) 75%),
    linear-gradient(45deg, var(--bg-soft) 25%, transparent 25%, transparent 75%, var(--bg-soft) 75%);
  background-size: 16px 16px;
  background-position: 0 0, 8px 8px;
  border-radius: 8px;
  padding: 14px;
}
.preview.vertical {
  max-width: 100%;
}
.preview.horizontal {
  max-height: 440px;
}
</style>
