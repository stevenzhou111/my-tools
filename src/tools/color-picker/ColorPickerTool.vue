<script setup>
import { ref } from 'vue'
import { loadImageFromFile } from '@/utils/image'
import { useCopy } from '@/utils/useCopy'

const fileInput = ref(null)
const dragging = ref(false)
const fileName = ref('')
const error = ref('')
const canvasEl = ref(null)
const image = ref(null)

const picked = ref(null) // { r, g, b }
const palette = ref([])
const { copiedKey, copy } = useCopy()

function pick() {
  fileInput.value?.click()
}
function onFileChange(e) {
  const f = e.target.files?.[0]
  if (f) load(f)
}
function onDrop(e) {
  dragging.value = false
  const f = e.dataTransfer?.files?.[0]
  if (f) load(f)
}
async function load(file) {
  error.value = ''
  if (!file.type.startsWith('image/')) return (error.value = '请选择图片文件')
  fileName.value = file.name
  try {
    image.value = await loadImageFromFile(file)
    draw()
  } catch (e) {
    error.value = e.message
  }
}

function draw() {
  const canvas = canvasEl.value
  if (!canvas || !image.value) return
  const maxW = 900
  const scale = Math.min(1, maxW / image.value.naturalWidth)
  canvas.width = Math.round(image.value.naturalWidth * scale)
  canvas.height = Math.round(image.value.naturalHeight * scale)
  canvas.getContext('2d').drawImage(image.value, 0, 0, canvas.width, canvas.height)
  picked.value = null
}

function onClickCanvas(e) {
  const canvas = canvasEl.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  const x = Math.floor(((e.clientX - rect.left) / rect.width) * canvas.width)
  const y = Math.floor(((e.clientY - rect.top) / rect.height) * canvas.height)
  const d = canvas.getContext('2d').getImageData(x, y, 1, 1).data
  picked.value = { r: d[0], g: d[1], b: d[2] }
}

async function screenPick() {
  if (!window.EyeDropper) {
    error.value = '当前浏览器不支持屏幕吸管(需要 Chrome / Edge 95+)'
    return
  }
  try {
    const result = await new window.EyeDropper().open()
    const m = result.sRGBHex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
    picked.value = { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
  } catch (e) {
    // 用户按 Esc 是正常取消;其他错误(权限拒绝等)要给反馈
    if (e?.name !== 'AbortError') error.value = '屏幕取色失败:' + (e?.message || e)
  }
}

function hex(c) {
  return '#' + [c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, '0')).join('')
}

function addToPalette() {
  if (!picked.value) return
  const h = hex(picked.value)
  if (!palette.value.includes(h)) palette.value.unshift(h)
  if (palette.value.length > 14) palette.value.pop()
}

function copyColor(h) {
  copy('pal-' + h, h)
}

function copyPicked() {
  if (picked.value) copy('picked', hex(picked.value))
}
</script>

<template>
  <div
    class="dropzone"
    :class="{ dragging }"
    @click="pick"
    @dragover.prevent="dragging = true"
    @dragleave.prevent="dragging = false"
    @drop.prevent="onDrop"
  >
    <input ref="fileInput" type="file" accept="image/*" hidden @change="onFileChange" />
    <div class="dz-icon">🎯</div>
    <p><strong>点击选择图片</strong> 或拖拽图片到此处,然后在图上点击吸取颜色</p>
  </div>

  <div v-if="error" class="error-box" style="margin-top: 12px">✗ {{ error }}</div>

  <template v-if="image">
    <div class="panel" style="margin-top: 14px">
      <canvas
        ref="canvasEl"
        class="pick-canvas"
        role="img"
        aria-label="图片取色区域,点击画面任意位置吸取颜色"
        :class="{ crosshair: true }"
        @click="onClickCanvas"
      ></canvas>
      <p class="tip" style="margin-top: 8px">👆 在图片上点击任意位置吸取颜色;点击色块可加入下方色板。</p>
    </div>

    <div class="panel" style="margin-top: 14px">
      <div class="row">
        <div class="swatch-big" :style="{ background: picked ? hex(picked) : 'var(--bg-soft)' }"></div>
        <div v-if="picked" class="picked-info">
          <div><span class="info-label">HEX</span><code>{{ hex(picked).toUpperCase() }}</code></div>
          <div><span class="info-label">RGB</span><code>rgb({{ picked.r }}, {{ picked.g }}, {{ picked.b }})</code></div>
        </div>
        <div v-else class="picked-info tip">还没有取色</div>
        <button v-if="picked" class="btn btn-sm" @click="copyPicked">
          {{ copiedKey === 'picked' ? '✓ 已复制' : '复制' }}
        </button>
        <button v-if="picked" class="btn btn-sm" @click="addToPalette">➕ 加入色板</button>
        <button class="btn btn-sm" style="margin-left: auto" @click="screenPick">💧 屏幕吸管</button>
      </div>
    </div>

    <div v-if="palette.length" class="panel" style="margin-top: 14px">
      <label class="field-label">色板({{ palette.length }})点击复制</label>
      <div class="palette">
        <button
          v-for="h in palette"
          :key="h"
          class="pal-swatch"
          :style="{ background: h }"
          :title="h"
          @click="copyColor(h)"
        >
          <span v-if="copiedKey === 'pal-' + h" class="pal-copied">✓</span>
        </button>
      </div>
    </div>
  </template>
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
.dropzone:hover,
.dropzone.dragging {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.dz-icon {
  font-size: 40px;
  margin-bottom: 6px;
}
.dropzone p { margin: 4px 0; }
.pick-canvas {
  max-width: 100%;
  border-radius: 8px;
  cursor: crosshair;
}
.swatch-big {
  width: 74px;
  height: 74px;
  border-radius: 10px;
  border: 1px solid var(--border);
  flex-shrink: 0;
}
.picked-info {
  font-size: 15px;
  display: grid;
  gap: 4px;
}
.info-label {
  display: inline-block;
  width: 44px;
  color: var(--muted);
  font-size: 14px;
}
.palette {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.pal-swatch {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  border: 1px solid var(--border);
  cursor: pointer;
  position: relative;
  transition: transform 0.1s;
}
.pal-swatch:hover {
  transform: scale(1.1);
}
.pal-copied {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  text-shadow: 0 0 4px rgba(0, 0, 0, 0.8);
  font-weight: 700;
}
</style>
