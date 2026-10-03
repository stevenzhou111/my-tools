<script setup>
import { onMounted, ref } from 'vue'
import { downloadCanvas } from '@/utils/image'

const canvasEl = ref(null)
const color = ref('#1f2430')
const size = ref(4)
const erasing = ref(false)
const canUndo = ref(false)

let ctx = null
let drawing = false
let lastX = 0
let lastY = 0
const undoStack = []
const MAX_UNDO = 20

function initCanvas() {
  const canvas = canvasEl.value
  canvas.width = 1000
  canvas.height = 620
  ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
}

function pos(e) {
  const rect = canvasEl.value.getBoundingClientRect()
  return {
    x: ((e.clientX - rect.left) / rect.width) * canvasEl.value.width,
    y: ((e.clientY - rect.top) / rect.height) * canvasEl.value.height,
  }
}

function startDraw(e) {
  drawing = true
  const { x, y } = pos(e)
  lastX = x
  lastY = y
  saveUndo()
  // 单击也画一个点
  ctx.beginPath()
  ctx.arc(x, y, (erasing.value ? size.value * 3 : size.value) / 2, 0, Math.PI * 2)
  ctx.fillStyle = erasing.value ? '#ffffff' : color.value
  ctx.fill()
}

function draw(e) {
  if (!drawing) return
  const { x, y } = pos(e)
  ctx.strokeStyle = erasing.value ? '#ffffff' : color.value
  ctx.lineWidth = erasing.value ? size.value * 3 : size.value
  ctx.beginPath()
  ctx.moveTo(lastX, lastY)
  ctx.lineTo(x, y)
  ctx.stroke()
  lastX = x
  lastY = y
}

function endDraw() {
  drawing = false
  canUndo.value = undoStack.length > 0
}

function saveUndo() {
  undoStack.push(ctx.getImageData(0, 0, canvasEl.value.width, canvasEl.value.height))
  if (undoStack.length > MAX_UNDO) undoStack.shift()
}

function undo() {
  if (!undoStack.length) return
  ctx.putImageData(undoStack.pop(), 0, 0)
  canUndo.value = undoStack.length > 0
}

function clearAll() {
  saveUndo()
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvasEl.value.width, canvasEl.value.height)
  canUndo.value = undoStack.length > 0
}

const COLORS = ['#1f2430', '#ef4444', '#f59e0b', '#10b981', '#6366f1', '#ec4899', '#06b6d4', '#ffffff']

onMounted(initCanvas)
</script>

<template>
  <div class="panel">
    <div class="row" style="margin-bottom: 12px">
      <button
        v-for="c in COLORS"
        :key="c"
        class="color-dot"
        :class="{ active: color === c && !erasing }"
        :style="{ background: c }"
        :title="c === '#ffffff' ? '白色' : c"
        @click="color = c; erasing = false"
      ></button>
      <button class="btn btn-sm" :class="{ active: erasing }" @click="erasing = !erasing">
        🧽 橡皮擦
      </button>
      <label class="ctrl">
        <span class="field-label">粗细 {{ size }}</span>
        <input v-model.number="size" type="range" min="1" max="40" />
      </label>
      <button class="btn btn-sm" :disabled="!canUndo" @click="undo">↩️ 撤销</button>
      <button class="btn btn-sm" @click="clearAll">🗑️ 清空</button>
      <button
        class="btn btn-sm btn-primary"
        @click="downloadCanvas(canvasEl, 'drawing-' + Date.now() + '.png', 'image/png')"
      >
        ⬇️ 保存 PNG
      </button>
    </div>

    <canvas
      ref="canvasEl"
      class="pad"
      role="img"
      aria-label="手绘画板,用鼠标或手指绘制"
      @pointerdown.prevent="startDraw"
      @pointermove.prevent="draw"
      @pointerup="endDraw"
      @pointerleave="endDraw"
    ></canvas>
    <p class="tip" style="margin-top: 10px">支持鼠标与触屏手写;画布内容仅保存在本地。</p>
  </div>
</template>

<style scoped>
.color-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid var(--border);
  cursor: pointer;
  transition: transform 0.1s;
}
.color-dot:hover {
  transform: scale(1.15);
}
.color-dot.active {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
.btn.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
.ctrl {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 130px;
}
.pad {
  width: 100%;
  height: auto;
  aspect-ratio: 1000 / 620;
  border: 1px solid var(--border);
  border-radius: 10px;
  cursor: crosshair;
  touch-action: none;
  background: #fff;
}
</style>
