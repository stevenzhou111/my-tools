<script setup>
import AppIcon from '@/components/AppIcon.vue'
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { downloadCanvas, loadImageFromFile } from '@/utils/image'
import { debounce } from '@/utils/format'
import { isEmptyRect, mosaicBlock, normalizeRect } from '@/utils/redact'

const fileInput = ref(null)
const canvasRef = ref(null)
const image = ref(null)
const fileName = ref('')
const error = ref('')
const dragging = ref(false)

const regions = ref([])
const mode = ref('mosaic')
const strength = ref(50)
const solidColor = ref('#111827')

const natural = ref({ w: 0, h: 0 })
const dragStart = ref(null)
const dragCurrent = ref(null)

const previewRect = computed(() => {
  if (!dragStart.value || !dragCurrent.value) return null
  const r = normalizeRect(dragStart.value, dragCurrent.value, natural.value.w, natural.value.h)
  return isEmptyRect(r) ? null : r
})

function pick() {
  fileInput.value?.click()
}

function onFileChange(e) {
  const f = e.target.files?.[0]
  if (f) load(f)
  e.target.value = ''
}

function onDrop(e) {
  dragging.value = false
  const f = e.dataTransfer?.files?.[0]
  if (f) load(f)
}

async function load(file) {
  error.value = ''
  if (!file.type.startsWith('image/')) {
    error.value = '请选择图片文件'
    return
  }
  try {
    const img = await loadImageFromFile(file)
    image.value = img
    fileName.value = file.name
    natural.value = { w: img.naturalWidth, h: img.naturalHeight }
    regions.value = []
    dragStart.value = null
    dragCurrent.value = null
    await nextTick()
    const canvas = canvasRef.value
    if (canvas) {
      const scale = Math.min(1, 1000 / img.naturalWidth, 620 / img.naturalHeight)
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
    }
    render()
  } catch (e) {
    error.value = e.message
  }
}

function drawMosaic(ctx, rect, w, h) {
  const sx = (rect.x / natural.value.w) * w
  const sy = (rect.y / natural.value.h) * h
  const sw = Math.max(1, (rect.w / natural.value.w) * w)
  const sh = Math.max(1, (rect.h / natural.value.h) * h)
  const block = Math.max(2, mosaicBlock(strength.value) * (w / natural.value.w))

  const small = document.createElement('canvas')
  small.width = Math.max(1, Math.round(sw / block))
  small.height = Math.max(1, Math.round(sh / block))
  small.getContext('2d').drawImage(image.value, rect.x, rect.y, rect.w, rect.h, 0, 0, small.width, small.height)

  ctx.imageSmoothingEnabled = false
  ctx.drawImage(small, 0, 0, small.width, small.height, sx, sy, sw, sh)
  ctx.imageSmoothingEnabled = true
}

function drawBlur(ctx, rect, w, h) {
  const sx = (rect.x / natural.value.w) * w
  const sy = (rect.y / natural.value.h) * h
  const sw = Math.max(1, (rect.w / natural.value.w) * w)
  const sh = Math.max(1, (rect.h / natural.value.h) * h)
  const radius = Math.max(1, (2 + (strength.value / 100) * 26) * (w / natural.value.w))

  ctx.save()
  ctx.beginPath()
  ctx.rect(sx, sy, sw, sh)
  ctx.clip()
  ctx.filter = `blur(${radius}px)`
  ctx.drawImage(image.value, 0, 0, w, h)
  ctx.filter = 'none'
  ctx.restore()
}

function drawSolid(ctx, rect, w, h) {
  const sx = (rect.x / natural.value.w) * w
  const sy = (rect.y / natural.value.h) * h
  const sw = Math.max(1, (rect.w / natural.value.w) * w)
  const sh = Math.max(1, (rect.h / natural.value.h) * h)
  ctx.fillStyle = solidColor.value
  ctx.fillRect(sx, sy, sw, sh)
}

function paintRect(ctx, rect, w, h, outline = false) {
  if (rect.w < 1 || rect.h < 1) return
  if (mode.value === 'blur') drawBlur(ctx, rect, w, h)
  else if (mode.value === 'solid') drawSolid(ctx, rect, w, h)
  else drawMosaic(ctx, rect, w, h)

  if (!outline) return
  const sx = (rect.x / natural.value.w) * w
  const sy = (rect.y / natural.value.h) * h
  const sw = (rect.w / natural.value.w) * w
  const sh = (rect.h / natural.value.h) * h
  ctx.save()
  ctx.strokeStyle = '#6366f1'
  ctx.lineWidth = 2
  ctx.setLineDash([6, 4])
  ctx.strokeRect(sx, sy, sw, sh)
  ctx.restore()
}

function render() {
  const canvas = canvasRef.value
  const img = image.value
  if (!canvas || !img) return
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  for (const rect of regions.value) paintRect(ctx, rect, canvas.width, canvas.height)
  if (previewRect.value) paintRect(ctx, previewRect.value, canvas.width, canvas.height, true)
}

const scheduleRender = debounce(render, 50)
watch([mode, strength, solidColor], scheduleRender)
onUnmounted(() => scheduleRender.cancel())

function point(e) {
  const canvas = canvasRef.value
  const rect = canvas.getBoundingClientRect()
  if (!rect.width || !rect.height) return { x: 0, y: 0 }
  return {
    x: ((e.clientX - rect.left) / rect.width) * natural.value.w,
    y: ((e.clientY - rect.top) / rect.height) * natural.value.h,
  }
}

function startDrag(e) {
  if (!image.value) return
  e.preventDefault()
  try {
    e.currentTarget.setPointerCapture(e.pointerId)
  } catch {
    /* 某些浏览器不支持指针捕获,不影响拖拽 */
  }
  dragStart.value = point(e)
  dragCurrent.value = dragStart.value
  render()
}

function moveDrag(e) {
  if (!dragStart.value) return
  dragCurrent.value = point(e)
  render()
}

function endDrag() {
  if (!dragStart.value) return
  const rect = normalizeRect(dragStart.value, dragCurrent.value, natural.value.w, natural.value.h)
  dragStart.value = null
  dragCurrent.value = null
  if (!isEmptyRect(rect, 3)) regions.value.push(rect)
  render()
}

function cancelDrag() {
  dragStart.value = null
  dragCurrent.value = null
  render()
}

function undo() {
  regions.value.pop()
  render()
}

function clearAll() {
  regions.value = []
  render()
}

function download() {
  if (!image.value || !regions.value.length) return
  error.value = ''
  try {
    const canvas = document.createElement('canvas')
    canvas.width = natural.value.w
    canvas.height = natural.value.h
    const ctx = canvas.getContext('2d')
    ctx.drawImage(image.value, 0, 0)
    for (const rect of regions.value) paintRect(ctx, rect, canvas.width, canvas.height)
    downloadCanvas(canvas, fileName.value.replace(/\.[^.]+$/, '') + '-redacted.png', 'image/png')
  } catch (e) {
    error.value = '导出失败:' + e.message
  }
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
    <input ref="fileInput" type="file" accept="image/*" class="sr-only" aria-label="选择图片文件" @change="onFileChange" />
    <div v-if="!image">
      <div class="dz-icon"><AppIcon name="eraser" :size="30" /></div>
      <p><strong>点击选择图片</strong> 或拖拽图片到此处</p>
      <p class="tip">框选区域做马赛克 / 模糊 / 纯色遮挡,适合截图与证件脱敏</p>
    </div>
    <p v-else class="tip">点击或拖拽可更换图片</p>
  </div>

  <div v-if="error" class="error-box mt-12">✗ {{ error }}</div>

  <div v-if="image" class="panel mt-14">
    <div class="editor-wrap">
      <canvas
        ref="canvasRef"
        class="editor-canvas"
        aria-label="图片打码编辑区,按住拖拽框选要遮挡的区域"
        @pointerdown="startDrag"
        @pointermove="moveDrag"
        @pointerup="endDrag"
        @pointercancel="cancelDrag"
      ></canvas>
    </div>

    <div class="row mt-12">
      <select v-model="mode" class="select mode-select">
        <option value="mosaic">马赛克</option>
        <option value="blur">高斯模糊</option>
        <option value="solid">纯色填充</option>
      </select>
      <template v-if="mode !== 'solid'">
        <span class="tip">强度 {{ strength }}%</span>
        <input v-model.number="strength" type="range" min="5" max="100" step="5" class="range" aria-label="打码强度" />
      </template>
      <input v-else v-model="solidColor" type="color" title="遮挡颜色" />
      <button class="btn btn-sm" :disabled="!regions.length" @click="undo">撤销</button>
      <button class="btn btn-sm" :disabled="!regions.length" @click="clearAll">清空</button>
      <button class="btn btn-primary" :disabled="!regions.length" @click="download">下载 PNG</button>
    </div>

    <p class="tip mt-10">
      已框选 {{ regions.length }} 处;在图片上按住拖拽可继续添加,导出保持原分辨率。图片全程留在本机。
    </p>
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
  margin-bottom: 6px;
}
.dropzone p {
  margin: 4px 0;
}
.editor-wrap {
  display: flex;
  justify-content: center;
  padding: 12px;
  border-radius: 8px;
  background: var(--bg-soft);
  overflow: hidden;
}
.editor-canvas {
  display: block;
  max-width: 100%;
  height: auto;
  cursor: crosshair;
  touch-action: none;
  border-radius: 4px;
}
.mode-select {
  width: auto;
  min-width: 130px;
}
.range {
  width: 160px;
}
</style>