<script setup>
import { onUnmounted, ref } from 'vue'
import { downloadCanvas, loadImageFromFile } from '@/utils/image'
import { debounce } from '@/utils/format'

const fileInput = ref(null)
const dragging = ref(false)
const image = ref(null)
const fileName = ref('')
const error = ref('')
const previewUrl = ref('')
const activeFilter = ref('none')
const intensity = ref(50)

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

// 强度 0~100 归一化为 0~1
function buildFilter(id, i) {
  switch (id) {
    case 'gray': return 'grayscale(1)'
    case 'contrast': return 'grayscale(1) contrast(1.6)'
    case 'invert': return 'invert(1)'
    case 'sepia': return 'sepia(0.85) saturate(1.2)'
    case 'warm': return `sepia(${0.15 + i * 0.4}) saturate(1.4) hue-rotate(-15deg) brightness(1.06)`
    case 'cool': return `saturate(1.15) hue-rotate(${8 + i * 22}deg) brightness(1.03)`
    case 'vivid': return `saturate(${1 + i * 1.6}) contrast(1.08)`
    case 'blur': return `blur(${Math.max(1, i * 18)}px) brightness(1.02)`
    default: return 'none'
  }
}

function baseCanvas() {
  const img = image.value
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  canvas.getContext('2d').drawImage(img, 0, 0)
  return canvas
}

// 油画效果:色彩量化 + 提升饱和
function oilify(src) {
  const c = document.createElement('canvas')
  c.width = src.width
  c.height = src.height
  const ctx = c.getContext('2d')
  ctx.filter = 'saturate(1.5) contrast(1.1)'
  ctx.drawImage(src, 0, 0)
  ctx.filter = 'none'
  const id = ctx.getImageData(0, 0, c.width, c.height)
  const d = id.data
  const step = 26
  for (let i = 0; i < d.length; i += 4) {
    d[i] = Math.round(d[i] / step) * step
    d[i + 1] = Math.round(d[i + 1] / step) * step
    d[i + 2] = Math.round(d[i + 2] / step) * step
  }
  ctx.putImageData(id, 0, 0)
  return c
}

// 铅笔画:灰度 → 反色模糊 → color dodge 混合
function sketchify(src) {
  const w = src.width
  const h = src.height
  const sd = src.getContext('2d').getImageData(0, 0, w, h).data
  const gray = new Float32Array(w * h)
  for (let p = 0, i = 0; p < gray.length; p++, i += 4) {
    gray[p] = 0.299 * sd[i] + 0.587 * sd[i + 1] + 0.114 * sd[i + 2]
  }
  const blurCanvas = document.createElement('canvas')
  blurCanvas.width = w
  blurCanvas.height = h
  const bctx = blurCanvas.getContext('2d')
  const bid = bctx.createImageData(w, h)
  for (let p = 0, i = 0; p < gray.length; p++, i += 4) {
    const inv = 255 - gray[p]
    bid.data[i] = bid.data[i + 1] = bid.data[i + 2] = inv
    bid.data[i + 3] = 255
  }
  bctx.putImageData(bid, 0, 0)
  const mCanvas = document.createElement('canvas')
  mCanvas.width = w
  mCanvas.height = h
  const mctx = mCanvas.getContext('2d')
  mctx.filter = `blur(${Math.max(2, w / 100)}px)`
  mctx.drawImage(blurCanvas, 0, 0)
  const md = mctx.getImageData(0, 0, w, h).data
  const out = src.getContext('2d').createImageData(w, h)
  for (let p = 0, i = 0; p < gray.length; p++, i += 4) {
    const b = md[i]
    const v = b >= 255 ? 255 : Math.min(255, (gray[p] * 255) / (255 - b))
    const val = 255 - v
    out.data[i] = out.data[i + 1] = out.data[i + 2] = val
    out.data[i + 3] = 255
  }
  const oc = document.createElement('canvas')
  oc.width = w
  oc.height = h
  oc.getContext('2d').putImageData(out, 0, 0)
  return oc
}

// 马赛克:先缩小到 1/block 再无插值放大回来,块大小随强度变化
function pixelate(src, i) {
  const w = src.width
  const h = src.height
  const block = Math.max(2, Math.round(2 + i * 28))
  const small = document.createElement('canvas')
  small.width = Math.max(1, Math.round(w / block))
  small.height = Math.max(1, Math.round(h / block))
  small.getContext('2d').drawImage(src, 0, 0, small.width, small.height)
  const out = document.createElement('canvas')
  out.width = w
  out.height = h
  const octx = out.getContext('2d')
  octx.imageSmoothingEnabled = false
  octx.drawImage(small, 0, 0, w, h)
  return out
}

function render() {
  const img = image.value
  if (!img) return
  let canvas
  if (activeFilter.value === 'oil') {
    canvas = oilify(baseCanvas())
  } else if (activeFilter.value === 'sketch') {
    canvas = sketchify(baseCanvas())
  } else if (activeFilter.value === 'mosaic') {
    canvas = pixelate(baseCanvas(), intensity.value / 100)
  } else {
    canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    ctx.filter = buildFilter(activeFilter.value, intensity.value / 100)
    ctx.drawImage(img, 0, 0)
    ctx.filter = 'none'
  }
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  canvas.toBlob((b) => b && (previewUrl.value = URL.createObjectURL(b)), 'image/png')
}

const debouncedRender = debounce(render, 150)

onUnmounted(() => {
  debouncedRender.cancel()
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})

function setFilter(id) {
  activeFilter.value = id
  render()
}
function setIntensity() {
  debouncedRender()
}

function download() {
  if (!image.value) return
  // 重新生成完整画布用于导出
  let canvas
  if (activeFilter.value === 'oil') canvas = oilify(baseCanvas())
  else if (activeFilter.value === 'sketch') canvas = sketchify(baseCanvas())
  else if (activeFilter.value === 'mosaic') canvas = pixelate(baseCanvas(), intensity.value / 100)
  else {
    canvas = document.createElement('canvas')
    canvas.width = image.value.naturalWidth
    canvas.height = image.value.naturalHeight
    const ctx = canvas.getContext('2d')
    ctx.filter = buildFilter(activeFilter.value, intensity.value / 100)
    ctx.drawImage(image.value, 0, 0)
    ctx.filter = 'none'
  }
  downloadCanvas(canvas, fileName.value.replace(/\.[^.]+$/, '') + '-' + activeFilter.value + '.png', 'image/png')
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
      <div class="dz-icon">🎞️</div>
      <p><strong>点击选择图片</strong> 或拖拽图片到此处</p>
      <p class="tip">灰度、复古、毛玻璃、油画、铅笔画等滤镜,本地实时预览</p>
    </div>
    <p v-else class="tip">点击或拖拽可更换图片</p>
  </div>

  <div v-if="error" class="error-box" style="margin-top: 12px">✗ {{ error }}</div>

  <div v-if="image" class="panel" style="margin-top: 14px">
    <div class="filter-list">
      <button
        v-for="f in [
          { id: 'none', name: '原图' }, { id: 'gray', name: '黑白' }, { id: 'contrast', name: '高对比' },
          { id: 'invert', name: '反色' }, { id: 'sepia', name: '复古' }, { id: 'warm', name: '暖阳' },
          { id: 'cool', name: '冷调' }, { id: 'vivid', name: '鲜艳' }, { id: 'blur', name: '毛玻璃' },
          { id: 'mosaic', name: '马赛克' }, { id: 'oil', name: '油画' }, { id: 'sketch', name: '铅笔画' },
        ]"
        :key="f.id"
        class="btn btn-sm filter-btn"
        :class="{ active: activeFilter === f.id }"
        @click="setFilter(f.id)"
      >
        {{ f.name }}
      </button>
    </div>
    <div v-if="!['oil', 'sketch', 'gray', 'contrast', 'invert', 'sepia'].includes(activeFilter)" class="field" style="margin-top: 12px">
      <label class="field-label">滤镜强度 {{ intensity }}%</label>
      <input :value="intensity" type="range" min="5" max="100" step="5" style="width: 100%" @input="setIntensity($event.target.valueAsNumber)" />
    </div>
    <div class="preview-wrap">
      <img v-if="previewUrl" :src="previewUrl" class="preview" alt="滤镜预览" />
    </div>
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
.filter-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 4px;
}
.filter-btn.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
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
  max-height: 360px;
}
</style>
