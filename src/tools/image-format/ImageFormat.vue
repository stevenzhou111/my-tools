<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { downloadCanvas, loadImageFromFile } from '@/utils/image'
import { formatSize, debounce } from '@/utils/format'

const fileInput = ref(null)
const dragging = ref(false)
const image = ref(null)
const fileName = ref('')
const originalSize = ref(0)
const error = ref('')
const target = ref('image/png')
const quality = ref(0.9)
const previewUrl = ref('')
const resultSize = ref(0)

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
  originalSize.value = file.size
  try {
    image.value = await loadImageFromFile(file)
    render()
  } catch (e) {
    error.value = e.message
  }
}

async function render() {
  const img = image.value
  if (!img) return
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  // JPEG 无透明通道,先铺白底避免透明区域变黑
  if (target.value === 'image/jpeg') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  ctx.drawImage(img, 0, 0)
  const blob = await new Promise((res) => canvas.toBlob(res, target.value, quality.value))
  if (!blob) return (error.value = '当前浏览器不支持输出该格式')
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  resultSize.value = blob.size
  previewUrl.value = URL.createObjectURL(blob)
}

// PNG 为无损格式不参与质量参数,纯质量变化时不重渲染
watch([target, quality], debounce(([t], [oldT]) => {
  if (t === 'image/png' && oldT === 'image/png') return
  render()
}, 200))

onUnmounted(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})

const savedPct = computed(() => {
  if (!resultSize.value || !originalSize.value) return null
  const diff = Math.round((1 - resultSize.value / originalSize.value) * 100)
  return diff > 0 ? `省 ${diff}%` : `增大 ${-diff}%`
})

function download() {
  if (!image.value) return
  const canvas = document.createElement('canvas')
  canvas.width = image.value.naturalWidth
  canvas.height = image.value.naturalHeight
  const ctx = canvas.getContext('2d')
  if (target.value === 'image/jpeg') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  ctx.drawImage(image.value, 0, 0)
  const ext = target.value.split('/')[1].replace('jpeg', 'jpg')
  downloadCanvas(canvas, fileName.value.replace(/\.[^.]+$/, '') + '.' + ext, target.value, quality.value)
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
    <div class="dz-icon">🔁</div>
    <p><strong>点击选择图片</strong> 或拖拽到此处</p>
    <p class="tip">PNG / JPG / WebP 互转,支持 HEIC 之外的常见格式,全程本地转换</p>
  </div>

  <div v-if="error" class="error-box" style="margin-top: 12px">✗ {{ error }}</div>

  <div v-if="image" class="panel" style="margin-top: 14px">
    <div class="row" style="margin-bottom: 14px">
      <label class="ctrl">
        <span class="field-label">目标格式</span>
        <select v-model="target" class="select">
          <option value="image/png">PNG(无损,支持透明)</option>
          <option value="image/jpeg">JPG(有损,体积小)</option>
          <option value="image/webp">WebP(高清小体积)</option>
        </select>
      </label>
      <label v-if="target !== 'image/png'" class="ctrl">
        <span class="field-label">质量 {{ Math.round(quality * 100) }}%</span>
        <input v-model.number="quality" type="range" min="0.1" max="1" step="0.05" />
      </label>
      <span class="tip" style="margin-top: 24px">
        原始 {{ formatSize(originalSize) }} → 转换后
        <strong :style="{ color: savedPct && savedPct.startsWith('省') ? 'var(--accent)' : 'var(--danger)' }">{{ formatSize(resultSize) }}</strong>
        {{ savedPct ? `(${savedPct})` : '' }}
      </span>
    </div>
    <img v-if="previewUrl" :src="previewUrl" class="preview" alt="转换预览" />
  </div>

  <div v-if="previewUrl" class="row" style="margin-top: 14px">
    <button class="btn btn-primary" @click="download">⬇️ 下载转换结果</button>
    <span v-if="target === 'image/jpeg'" class="tip">JPG 无透明通道,已自动铺白底</span>
  </div>
</template>

<style scoped>
.dropzone {
  border: 2px dashed var(--border);
  border-radius: var(--radius);
  padding: 42px 20px;
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
.ctrl {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 200px;
}
.preview {
  max-width: 100%;
  max-height: 340px;
  border-radius: 8px;
  background:
    linear-gradient(45deg, var(--bg-soft) 25%, transparent 25%, transparent 75%, var(--bg-soft) 75%),
    linear-gradient(45deg, var(--bg-soft) 25%, transparent 25%, transparent 75%, var(--bg-soft) 75%);
  background-size: 16px 16px;
  background-position: 0 0, 8px 8px;
}
</style>
