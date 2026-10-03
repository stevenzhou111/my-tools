<script setup>
import { onUnmounted, ref, watch } from 'vue'
import { debounce, formatSize } from '@/utils/format'
import { downloadUrl } from '@/utils/image'

const fileInput = ref(null)
const lastFile = ref(null)
const fileName = ref('')
const originalSize = ref(0)
const originalUrl = ref('')
const resultUrl = ref('')
const resultSize = ref(0)
const quality = ref(0.7)
const format = ref('image/jpeg')
const maxWidth = ref(0)
const error = ref('')
const busy = ref(false)
const dragging = ref(false)

let resultBlob = null

function pick() {
  fileInput.value?.click()
}

function onFileChange(e) {
  const f = e.target.files?.[0]
  if (f) process(f)
}

function onDrop(e) {
  dragging.value = false
  const f = e.dataTransfer?.files?.[0]
  if (f) process(f)
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      if (!img.naturalWidth || !img.naturalHeight) {
        reject(new Error('图片没有有效的像素尺寸,无法处理'))
        return
      }
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('无法读取该图片'))
    }
    img.src = url
  })
}

async function process(file) {
  error.value = ''
  if (resultUrl.value) {
    URL.revokeObjectURL(resultUrl.value)
    resultUrl.value = ''
  }
  if (originalUrl.value) URL.revokeObjectURL(originalUrl.value)
  if (!file.type.startsWith('image/')) {
    error.value = '请选择图片文件'
    return
  }
  lastFile.value = file
  fileName.value = file.name
  originalSize.value = file.size
  originalUrl.value = URL.createObjectURL(file)
  busy.value = true
  try {
    const img = await loadImage(file)
    const scale = maxWidth.value > 0 ? Math.min(1, maxWidth.value / img.naturalWidth) : 1
    const w = Math.max(1, Math.round(img.naturalWidth * scale))
    const h = Math.max(1, Math.round(img.naturalHeight * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    // JPEG 不支持透明通道,先铺白底避免透明区域变黑
    if (format.value === 'image/jpeg') {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, w, h)
    }
    ctx.drawImage(img, 0, 0, w, h)
    resultBlob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('当前浏览器可能不支持输出该格式'))),
        format.value,
        quality.value,
      )
    })
    resultSize.value = resultBlob.size
    resultUrl.value = URL.createObjectURL(resultBlob)
  } catch (e) {
    error.value = '处理失败:' + e.message
  } finally {
    busy.value = false
  }
}

watch(
  [quality, format, maxWidth],
  debounce(() => {
    if (lastFile.value) process(lastFile.value)
  }, 200),
)

onUnmounted(() => {
  if (originalUrl.value) URL.revokeObjectURL(originalUrl.value)
  if (resultUrl.value) URL.revokeObjectURL(resultUrl.value)
})

function download() {
  if (!resultUrl.value) return
  const ext = format.value.split('/')[1].replace('jpeg', 'jpg')
  // resultUrl 由组件 onUnmounted 统一 revoke,这里只触发下载
  downloadUrl(resultUrl.value, fileName.value.replace(/\.[^.]+$/, '') + '-min.' + ext)
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
    <div v-if="!originalUrl">
      <div class="dz-icon">🖼️</div>
      <p><strong>点击选择图片</strong> 或拖拽图片到此处</p>
      <p class="tip">支持 JPG / PNG / WebP / GIF 等常见格式,全程本地处理</p>
    </div>
    <p v-else class="tip">点击或拖拽可更换图片</p>
  </div>

  <div v-if="error" class="error-box" style="margin: 12px 0">✗ {{ error }}</div>

  <div v-if="originalUrl" class="controls panel" style="margin-top: 14px">
    <div class="row">
      <label class="ctrl">
        <span class="ctrl-label">输出格式</span>
        <select v-model="format" class="select">
          <option value="image/jpeg">JPEG(体积最小)</option>
          <option value="image/webp">WebP(高清小体积)</option>
          <option value="image/png">PNG(无损)</option>
        </select>
      </label>
      <label class="ctrl">
        <span class="ctrl-label">最大宽度</span>
        <select v-model.number="maxWidth" class="select">
          <option :value="0">保持原始尺寸</option>
          <option :value="1920">1920 px</option>
          <option :value="1280">1280 px</option>
          <option :value="800">800 px</option>
          <option :value="400">400 px</option>
        </select>
      </label>
      <label class="ctrl">
        <span class="ctrl-label">质量 {{ Math.round(quality * 100) }}%</span>
        <input v-model.number="quality" type="range" min="0.1" max="1" step="0.05" />
      </label>
    </div>
    <p v-if="format === 'image/png'" class="tip">PNG 为无损格式,质量滑块对它不生效。</p>
  </div>

  <div v-if="originalUrl" class="grid-2" style="margin-top: 14px">
    <div class="panel">
      <div class="preview-head">
        <strong>原图</strong>
        <span class="tip">{{ formatSize(originalSize) }}</span>
      </div>
      <img :src="originalUrl" class="preview-img" alt="原图" />
    </div>
    <div class="panel">
      <div class="preview-head">
        <strong>压缩后</strong>
        <span v-if="resultSize" class="size-after">{{ formatSize(resultSize) }}</span>
      </div>
      <div v-if="busy" class="preview-empty">处理中…</div>
      <img v-else-if="resultUrl" :src="resultUrl" class="preview-img" alt="压缩后" />
      <div v-else class="preview-empty">等待生成</div>
    </div>
  </div>

  <div v-if="resultUrl" class="row" style="margin-top: 14px">
    <button class="btn btn-primary" @click="download">⬇️ 下载压缩后的图片</button>
    <span v-if="resultSize" class="tip">
      {{
        resultSize < originalSize
          ? `比原图小 ${formatSize(originalSize - resultSize)}(省 ${Math.max(0, Math.round((1 - resultSize / originalSize) * 100))}%)`
          : '压缩结果比原图更大,可尝试调低质量或改用 JPEG'
      }}
    </span>
  </div>
</template>

<style scoped>
.dropzone {
  border: 2px dashed var(--border);
  border-radius: var(--radius);
  padding: 44px 20px;
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
.controls .row {
  gap: 20px;
}
.ctrl {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 180px;
}
.ctrl-label {
  font-size: 14px;
  color: var(--muted);
}
.ctrl .select {
  width: 180px;
}
.preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.size-after {
  color: var(--accent);
  font-weight: 600;
}
.preview-img {
  width: 100%;
  max-height: 340px;
  object-fit: contain;
  border-radius: 8px;
  background: var(--bg-soft);
}
.preview-empty {
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted);
  background: var(--bg-soft);
  border-radius: 8px;
}
</style>
