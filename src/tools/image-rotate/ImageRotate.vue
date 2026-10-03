<script setup>
import { onUnmounted, ref } from 'vue'
import { downloadCanvas, loadImageFromFile } from '@/utils/image'

const fileInput = ref(null)
const dragging = ref(false)
const image = ref(null)
const fileName = ref('')
const error = ref('')
const previewUrl = ref('')
const applied = ref('原图')

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
    applied.value = '原图'
    render('原图')
  } catch (e) {
    error.value = e.message
  }
}

function render(label) {
  const img = image.value
  if (!img) return
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  canvas.getContext('2d').drawImage(img, 0, 0)
  output.value = canvas
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  canvas.toBlob((b) => b && (previewUrl.value = URL.createObjectURL(b)), 'image/png')
  applied.value = label
}

const output = ref(null)

onUnmounted(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})

function transform(type) {
  const src = output.value
  if (!src) return
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const w = src.width
  const h = src.height
  if (type === 'left' || type === 'right') {
    canvas.width = h
    canvas.height = w
  } else {
    canvas.width = w
    canvas.height = h
  }
  ctx.translate(canvas.width / 2, canvas.height / 2)
  switch (type) {
    case 'left': ctx.rotate(-Math.PI / 2); break
    case 'right': ctx.rotate(Math.PI / 2); break
    case 'flip-h': ctx.scale(-1, 1); break
    case 'flip-v': ctx.scale(1, -1); break
    case 'rotate180': ctx.rotate(Math.PI); break
  }
  ctx.drawImage(src, -w / 2, -h / 2)
  output.value = canvas
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  canvas.toBlob((b) => b && (previewUrl.value = URL.createObjectURL(b)), 'image/png')
  const LABELS = { left: '左转 90°', right: '右转 90°', 'flip-h': '水平镜像', 'flip-v': '垂直镜像', rotate180: '旋转 180°' }
  applied.value = LABELS[type]
}

function download() {
  if (!output.value) return
  downloadCanvas(output.value, fileName.value.replace(/\.[^.]+$/, '') + '-rotated.png', 'image/png')
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
      <div class="dz-icon">🔄</div>
      <p><strong>点击选择图片</strong> 或拖拽图片到此处</p>
      <p class="tip">旋转、翻转可以叠加操作,全程本地处理</p>
    </div>
    <p v-else class="tip">点击或拖拽可更换图片</p>
  </div>

  <div v-if="error" class="error-box" style="margin-top: 12px">✗ {{ error }}</div>

  <div v-if="image" class="panel" style="margin-top: 14px">
    <div class="row" style="margin-bottom: 14px">
      <button class="btn" @click="transform('left')">↺ 左转 90°</button>
      <button class="btn" @click="transform('right')">↻ 右转 90°</button>
      <button class="btn" @click="transform('rotate180')">⇅ 旋转 180°</button>
      <button class="btn" @click="transform('flip-h')">⇋ 水平镜像</button>
      <button class="btn" @click="transform('flip-v')">⇊ 垂直镜像</button>
      <button class="btn" @click="render('原图')">重置</button>
    </div>
    <div class="preview-wrap">
      <img v-if="previewUrl" :src="previewUrl" class="preview" alt="预览" />
    </div>
    <p class="tip" style="margin-top: 10px">当前状态:{{ applied }} · 尺寸 {{ output?.width }} × {{ output?.height }}</p>
  </div>

  <div v-if="previewUrl" class="row" style="margin-top: 14px">
    <button class="btn btn-primary" @click="download">⬇️ 下载 PNG</button>
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
