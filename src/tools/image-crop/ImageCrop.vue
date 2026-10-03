<script setup>
import { onUnmounted, ref, watch } from 'vue'
import { downloadCanvas, loadImageFromFile } from '@/utils/image'
import { debounce } from '@/utils/format'

const fileInput = ref(null)
const dragging = ref(false)
const image = ref(null)
const fileName = ref('')
const error = ref('')
const previewUrl = ref('')
const ratio = ref('1:1')
const position = ref('center')
const zoom = ref(100)

const RATIOS = [
  { id: '1:1', w: 1, h: 1, name: '1:1 头像' },
  { id: '4:3', w: 4, h: 3, name: '4:3' },
  { id: '3:4', w: 3, h: 4, name: '3:4' },
  { id: '16:9', w: 16, h: 9, name: '16:9' },
  { id: '9:16', w: 9, h: 16, name: '9:16' },
  { id: '3:2', w: 3, h: 2, name: '3:2 照片' },
]

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

// 计算按比例和缩放内切于原图的裁切窗口
function cropRect() {
  const img = image.value
  const r = RATIOS.find((x) => x.id === ratio.value)
  const targetRatio = r.w / r.h
  const scale = zoom.value / 100
  let w = img.naturalWidth
  let h = img.naturalWidth / targetRatio
  if (h > img.naturalHeight) {
    h = img.naturalHeight
    w = img.naturalHeight * targetRatio
  }
  w *= scale
  h *= scale
  w = Math.min(w, img.naturalWidth)
  h = Math.min(h, img.naturalHeight)
  let x = (img.naturalWidth - w) / 2
  let y = (img.naturalHeight - h) / 2
  if (position.value.includes('left')) x = 0
  if (position.value.includes('right')) x = img.naturalWidth - w
  if (position.value.includes('top')) y = 0
  if (position.value.includes('bottom')) y = img.naturalHeight - h
  return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) }
}

function render() {
  const img = image.value
  if (!img) return
  const { x, y, w, h } = cropRect()
  if (w < 1 || h < 1) return
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d').drawImage(img, x, y, w, h, 0, 0, w, h)
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  canvas.toBlob((b) => b && (previewUrl.value = URL.createObjectURL(b)), 'image/png')
}

watch([ratio, position, zoom], debounce(render, 120))

onUnmounted(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})

function download() {
  if (!image.value) return
  const { x, y, w, h } = cropRect()
  if (w < 1 || h < 1) {
    error.value = '裁切窗口过小,请调大缩放比例'
    return
  }
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d').drawImage(image.value, x, y, w, h, 0, 0, w, h)
  downloadCanvas(canvas, fileName.value.replace(/\.[^.]+$/, '') + '-' + ratio.value.replace(':', 'x') + '.png', 'image/png')
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
      <div class="dz-icon">✂️</div>
      <p><strong>点击选择图片</strong> 或拖拽图片到此处</p>
      <p class="tip">常用比例一键裁切,支持调整窗口大小与位置</p>
    </div>
    <p v-else class="tip">点击或拖拽可更换图片</p>
  </div>

  <div v-if="error" class="error-box" style="margin-top: 12px">✗ {{ error }}</div>

  <div v-if="image" class="panel" style="margin-top: 14px">
    <div class="row" style="margin-bottom: 12px">
      <label v-for="r in RATIOS" :key="r.id" class="check">
        <input v-model="ratio" type="radio" :value="r.id" />{{ r.name }}
      </label>
    </div>
    <div class="row" style="margin-bottom: 12px">
      <label class="ctrl-inline">窗口大小 <strong>{{ zoom }}%</strong>
        <input v-model.number="zoom" type="range" min="20" max="100" />
      </label>
      <div class="grid9">
        <button
          v-for="p in ['top-left', 'top-center', 'top-right', 'middle-left', 'center', 'middle-right', 'bottom-left', 'bottom-center', 'bottom-right']"
          :key="p"
          class="g9-cell"
          :class="{ active: position === p }"
          @click="position = p"
        ></button>
      </div>
    </div>
    <div class="preview-wrap">
      <img v-if="previewUrl" :src="previewUrl" class="preview" alt="裁切预览" />
    </div>
    <p class="tip" style="margin-top: 8px">
      裁切区域 {{ cropRect().w }} × {{ cropRect().h }} px(原图 {{ image.naturalWidth }} × {{ image.naturalHeight }})
    </p>
  </div>

  <div v-if="previewUrl" class="row" style="margin-top: 14px">
    <button class="btn btn-primary" @click="download">⬇️ 下载裁切结果</button>
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
.ctrl-inline {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
}
.grid9 {
  display: grid;
  grid-template-columns: repeat(3, 26px);
  gap: 4px;
}
.g9-cell {
  height: 26px;
  border: 1px solid var(--border);
  border-radius: 5px;
  background: var(--card);
  cursor: pointer;
}
.g9-cell.active {
  background: var(--accent);
  border-color: var(--accent);
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
  max-height: 320px;
}
</style>
