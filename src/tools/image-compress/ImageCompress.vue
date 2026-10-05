<script setup>
import { onUnmounted, reactive, ref } from 'vue'
import { debounce, formatSize } from '@/utils/format'
import { downloadBlob, downloadUrl } from '@/utils/image'
import { zipSync } from 'fflate'

const fileInput = ref(null)
const items = reactive([])
const quality = ref(0.7)
const format = ref('image/jpeg')
const maxWidth = ref(0)
const error = ref('')
const busyCount = ref(0)
const dragging = ref(false)

// 每张图的对象引用要稳定,便于设置变化时整体重跑
let uid = 0

function pick() {
  fileInput.value?.click()
}

function onFileChange(e) {
  addFiles([...(e.target.files ?? [])])
}

function onDrop(e) {
  dragging.value = false
  addFiles([...(e.dataTransfer?.files ?? [])])
}

function addFiles(files) {
  const imgs = files.filter((f) => f.type.startsWith('image/'))
  if (!imgs.length) {
    error.value = '请选择图片文件'
    return
  }
  error.value = ''
  for (const f of imgs.slice(0, 30)) {
    const item = reactive({
      id: ++uid,
      file: f,
      name: f.name,
      originalSize: f.size,
      originalUrl: URL.createObjectURL(f),
      resultUrl: '',
      resultSize: 0,
      blob: null,
      status: 'pending', // pending | busy | done | error
      errorMsg: '',
    })
    items.push(item)
  }
  runAll()
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

async function processItem(item) {
  item.status = 'busy'
  item.errorMsg = ''
  if (item.resultUrl) {
    URL.revokeObjectURL(item.resultUrl)
    item.resultUrl = ''
  }
  try {
    const img = await loadImage(item.file)
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
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('当前浏览器可能不支持输出该格式'))),
        format.value,
        quality.value,
      )
    })
    item.blob = blob
    item.resultSize = blob.size
    item.resultUrl = URL.createObjectURL(blob)
    item.status = 'done'
  } catch (e) {
    item.status = 'error'
    item.errorMsg = e.message
  }
}

async function runAll() {
  const pending = items.filter((i) => i.status !== 'done' || !i.blob)
  if (!pending.length) return
  busyCount.value = pending.length
  // 串行处理,避免同时解码大量大图撑爆内存
  for (const item of pending) {
    await processItem(item)
    busyCount.value--
  }
}

const rerunAll = debounce(() => {
  for (const item of items) item.status = 'pending'
  runAll()
}, 250)

function removeItem(item) {
  const idx = items.indexOf(item)
  if (idx === -1) return
  URL.revokeObjectURL(item.originalUrl)
  if (item.resultUrl) URL.revokeObjectURL(item.resultUrl)
  items.splice(idx, 1)
}

function clearAll() {
  for (const item of items) {
    URL.revokeObjectURL(item.originalUrl)
    if (item.resultUrl) URL.revokeObjectURL(item.resultUrl)
  }
  items.length = 0
}

onUnmounted(() => {
  rerunAll.cancel()
  clearAll()
})

function ext() {
  return format.value.split('/')[1].replace('jpeg', 'jpg')
}
function outName(item) {
  return item.name.replace(/\.[^.]+$/, '') + '-min.' + ext()
}

function download(item) {
  if (item.resultUrl) downloadUrl(item.resultUrl, outName(item))
}

async function downloadZip() {
  const entries = {}
  const used = new Set()
  for (const item of items) {
    if (!item.blob) continue
    let name = outName(item)
    if (used.has(name)) name = name.replace(/(\.[^.]+)$/, `-${item.id}$1`)
    used.add(name)
    entries[name] = new Uint8Array(await item.blob.arrayBuffer())
  }
  downloadBlob(new Blob([zipSync(entries)], { type: 'application/zip' }), `images-min-${ext()}.zip`)
}

const totals = () => {
  const done = items.filter((i) => i.status === 'done')
  return {
    count: done.length,
    before: done.reduce((s, i) => s + i.originalSize, 0),
    after: done.reduce((s, i) => s + i.resultSize, 0),
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
    <input ref="fileInput" type="file" accept="image/*" multiple hidden @change="onFileChange" />
    <div v-if="!items.length">
      <div class="dz-icon">🖼️</div>
      <p><strong>点击选择图片</strong> 或拖拽图片到此处(可一次多选)</p>
      <p class="tip">支持 JPG / PNG / WebP / GIF 等,最多 30 张,全程本地处理</p>
    </div>
    <p v-else class="tip">点击或拖拽可继续添加图片</p>
  </div>

  <div v-if="error" class="error-box" style="margin: 12px 0">✗ {{ error }}</div>

  <div v-if="items.length" class="controls panel" style="margin-top: 14px">
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

  <div v-if="items.length" class="panel" style="margin-top: 14px; padding: 10px 14px">
    <div v-for="item in items" :key="item.id" class="item-row">
      <img :src="item.resultUrl || item.originalUrl" class="thumb" alt="" />
      <div class="item-main">
        <div class="item-name" :title="item.name">{{ item.name }}</div>
        <div class="item-sizes">
          {{ formatSize(item.originalSize) }}
          <template v-if="item.status === 'done'">
            →
            <span class="size-after" :class="{ bigger: item.resultSize >= item.originalSize }">{{ formatSize(item.resultSize) }}</span>
            <span class="tip">(-{{ Math.max(0, Math.round((1 - item.resultSize / item.originalSize) * 100)) }}%)</span>
          </template>
          <template v-else-if="item.status === 'busy'">处理中…</template>
          <template v-else-if="item.status === 'error'" class="tip">✗ {{ item.errorMsg }}</template>
        </div>
      </div>
      <button v-if="item.status === 'done'" class="btn btn-sm" @click="download(item)">下载</button>
      <button class="btn btn-sm" aria-label="移除" @click="removeItem(item)">✕</button>
    </div>
  </div>

  <div v-if="items.length" class="row" style="margin-top: 14px">
    <button class="btn btn-primary" :disabled="busyCount > 0" @click="downloadZip">
      ⬇️ 打包下载全部(ZIP)
    </button>
    <button class="btn" :disabled="busyCount > 0" @click="clearAll">清空列表</button>
    <span v-if="totals().count" class="tip">
      {{ totals().count }} 张完成:{{ formatSize(totals().before) }} → {{ formatSize(totals().after) }}
      <template v-if="totals().after < totals().before">
        (共省 {{ formatSize(totals().before - totals().after) }})
      </template>
      <template v-else>(整体反而更大,可尝试调低质量或改用 JPEG)</template>
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
.item-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 4px;
  border-bottom: 1px solid var(--border);
}
.item-row:last-child {
  border-bottom: none;
}
.thumb {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: 8px;
  background: var(--bg-soft);
  flex-shrink: 0;
}
.item-main {
  flex: 1;
  min-width: 0;
}
.item-name {
  font-size: 14.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.item-sizes {
  font-size: 13.5px;
  font-family: var(--mono);
  color: var(--muted);
}
.size-after {
  color: var(--accent);
  font-weight: 600;
}
.size-after.bigger {
  color: var(--danger);
}
</style>
