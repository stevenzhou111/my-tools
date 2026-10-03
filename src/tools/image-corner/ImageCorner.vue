<script setup>
import { onUnmounted, ref, watch } from 'vue'
import { downloadCanvas, loadImageFromFile } from '@/utils/image'
import { debounce } from '@/utils/format'

const fileInput = ref(null)
const dragging = ref(false)
const image = ref(null)
const fileName = ref('')
const error = ref('')
const radius = ref(20)

const canvasEl = ref(null)

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
    render()
  } catch (e) {
    error.value = e.message
  }
}

const previewUrl = ref('')
let resultBlob = null

function render() {
  const img = image.value
  if (!img) return
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  const r = (Math.min(canvas.width, canvas.height) / 2) * (radius.value / 100)
  ctx.save()
  roundRect(ctx, 0, 0, canvas.width, canvas.height, r)
  ctx.clip()
  ctx.drawImage(img, 0, 0)
  ctx.restore()
  canvas.toBlob((b) => {
    if (!b) return
    resultBlob = b
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = URL.createObjectURL(b)
  }, 'image/png')
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

watch(radius, debounce(render, 120))

onUnmounted(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})

function download() {
  if (!image.value) return
  const canvas = document.createElement('canvas')
  canvas.width = image.value.naturalWidth
  canvas.height = image.value.naturalHeight
  const ctx = canvas.getContext('2d')
  const r = (Math.min(canvas.width, canvas.height) / 2) * (radius.value / 100)
  ctx.save()
  roundRect(ctx, 0, 0, canvas.width, canvas.height, r)
  ctx.clip()
  ctx.drawImage(image.value, 0, 0)
  ctx.restore()
  downloadCanvas(canvas, fileName.value.replace(/\.[^.]+$/, '') + '-rounded.png', 'image/png')
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
    <div v-if="!image">
      <div class="dz-icon">⬜</div>
      <p><strong>点击选择图片</strong> 或拖拽图片到此处</p>
      <p class="tip">圆形、圆角头像一步完成,输出透明背景 PNG</p>
    </div>
    <p v-else class="tip">点击或拖拽可更换图片</p>
  </div>

  <div v-if="error" class="error-box" style="margin-top: 12px">✗ {{ error }}</div>

  <div v-if="image" class="panel" style="margin-top: 14px">
    <div class="field">
      <label class="field-label">圆角程度:{{ radius }}%(100% 即为圆形)</label>
      <input v-model.number="radius" type="range" min="0" max="100" step="1" style="width: 100%" />
    </div>
    <div class="preview-wrap">
      <img :src="previewUrl" class="preview" alt="圆角预览" />
    </div>
  </div>

  <div v-if="previewUrl" class="row" style="margin-top: 14px">
    <button class="btn btn-primary" @click="download">⬇️ 下载 PNG(透明背景)</button>
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
.preview-wrap {
  display: flex;
  justify-content: center;
  background:
    linear-gradient(45deg, var(--bg-soft) 25%, transparent 25%, transparent 75%, var(--bg-soft) 75%),
    linear-gradient(45deg, var(--bg-soft) 25%, transparent 25%, transparent 75%, var(--bg-soft) 75%);
  background-size: 16px 16px;
  background-position: 0 0, 8px 8px;
  border-radius: 8px;
  padding: 16px;
}
.preview {
  max-width: 100%;
  max-height: 340px;
}
</style>
