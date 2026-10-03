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
const borderColor = ref('#6366f1')
const borderWidth = ref(20)
const padding = ref(0)
const bgTransparent = ref(false)

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

function render() {
  const img = image.value
  if (!img) return
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth + (borderWidth.value + padding.value) * 2
  canvas.height = img.naturalHeight + (borderWidth.value + padding.value) * 2
  const ctx = canvas.getContext('2d')
  if (!bgTransparent.value) {
    ctx.fillStyle = borderColor.value
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  } else {
    ctx.fillStyle = borderColor.value
    ctx.fillRect(padding.value, padding.value, canvas.width - padding.value * 2, canvas.height - padding.value * 2)
  }
  ctx.drawImage(img, borderWidth.value + padding.value, borderWidth.value + padding.value)
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  canvas.toBlob((b) => b && (previewUrl.value = URL.createObjectURL(b)), 'image/png')
}

watch([borderColor, borderWidth, padding, bgTransparent], debounce(render, 150))

onUnmounted(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})

function download() {
  if (!image.value) return
  const canvas = document.createElement('canvas')
  canvas.width = image.value.naturalWidth + (borderWidth.value + padding.value) * 2
  canvas.height = image.value.naturalHeight + (borderWidth.value + padding.value) * 2
  const ctx = canvas.getContext('2d')
  if (!bgTransparent.value) {
    ctx.fillStyle = borderColor.value
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  } else {
    ctx.fillStyle = borderColor.value
    ctx.fillRect(padding.value, padding.value, canvas.width - padding.value * 2, canvas.height - padding.value * 2)
  }
  ctx.drawImage(image.value, borderWidth.value + padding.value, borderWidth.value + padding.value)
  downloadCanvas(canvas, fileName.value.replace(/\.[^.]+$/, '') + '-border.png', 'image/png')
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
      <div class="dz-icon">🖼</div>
      <p><strong>点击选择图片</strong> 或拖拽图片到此处</p>
      <p class="tip">支持自定义边框颜色、粗细与四周留白</p>
    </div>
    <p v-else class="tip">点击或拖拽可更换图片</p>
  </div>

  <div v-if="error" class="error-box" style="margin-top: 12px">✗ {{ error }}</div>

  <div v-if="image" class="panel" style="margin-top: 14px">
    <div class="row" style="margin-bottom: 14px">
      <label class="ctrl">
        <span class="ctrl-label">边框颜色</span>
        <input v-model="borderColor" type="color" class="input" />
      </label>
      <label class="ctrl">
        <span class="ctrl-label">边框粗细 {{ borderWidth }} px</span>
        <input v-model.number="borderWidth" type="range" min="0" max="100" />
      </label>
      <label class="ctrl">
        <span class="ctrl-label">额外留白 {{ padding }} px</span>
        <input v-model.number="padding" type="range" min="0" max="100" />
      </label>
      <label class="check" style="margin-top: 18px">
        <input v-model="bgTransparent" type="checkbox" />留白区域透明
      </label>
    </div>
    <div class="preview-wrap">
      <img v-if="previewUrl" :src="previewUrl" class="preview" alt="预览" />
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
.ctrl {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 170px;
}
.ctrl-label {
  font-size: 14px;
  color: var(--muted);
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
  max-height: 340px;
}
</style>
