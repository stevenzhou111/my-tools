<script setup>
import { onUnmounted, ref } from 'vue'
import { extractPalette } from '@/utils/palette'
import { loadImageFromFile } from '@/utils/image'
import { useCopy } from '@/utils/useCopy'

const fileInput = ref(null)
const dragging = ref(false)
const error = ref('')
const previewUrl = ref('')
const palette = ref([])
const count = ref(6)

const { copiedKey, copy } = useCopy()

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
  try {
    const img = await loadImageFromFile(file)
    render(img)
  } catch (e) {
    error.value = e.message
  }
}

// 统计用缩到最长边 128 的小图(4096 级量化足够稳且瞬时完成);预览走原图
function render(img) {
  const scale = Math.min(1, 128 / Math.max(img.naturalWidth, img.naturalHeight))
  const w = Math.max(1, Math.round(img.naturalWidth * scale))
  const h = Math.max(1, Math.round(img.naturalHeight * scale))
  const small = document.createElement('canvas')
  small.width = w
  small.height = h
  small.getContext('2d').drawImage(img, 0, 0, w, h)
  const { data } = small.getContext('2d').getImageData(0, 0, w, h)
  palette.value = extractPalette(data, count.value)

  const full = document.createElement('canvas')
  full.width = img.naturalWidth
  full.height = img.naturalHeight
  full.getContext('2d').drawImage(img, 0, 0)
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  full.toBlob((b) => b && (previewUrl.value = URL.createObjectURL(b)), 'image/png')
}

function reload() {
  const f = fileInput.value?.files?.[0]
  if (f) load(f)
}

function cssVars() {
  return palette.value.map((c, i) => `--palette-${i + 1}: ${c.hex};`).join('\n')
}

onUnmounted(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})

const SAMPLE = '支持 JPG / PNG / WebP,纯本地统计'
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
    <div v-if="!previewUrl">
      <div class="dz-icon">🎨</div>
      <p><strong>点击选择图片</strong> 或拖拽图片到此处</p>
      <p class="tip">{{ SAMPLE }}</p>
    </div>
    <p v-else class="tip">点击或拖拽可更换图片</p>
  </div>

  <div v-if="error" class="error-box" style="margin-top: 12px">✗ {{ error }}</div>

  <template v-if="previewUrl">
    <div class="row" style="margin-top: 14px; justify-content: space-between">
      <label class="ctrl">
        <span class="field-label" style="margin: 0">主色数量(1–12)</span>
        <input v-model.number="count" class="input count-input" type="number" min="1" max="12" @change="reload" />
      </label>
      <button class="btn btn-sm" @click="copy('cssvars', cssVars())">
        {{ copiedKey === 'cssvars' ? '✓ 已复制 CSS 变量' : '复制为 CSS 变量' }}
      </button>
    </div>

    <div class="pal-list" style="margin-top: 12px">
      <button
        v-for="(c, i) in palette"
        :key="c.hex + '-' + i"
        class="pal-swatch"
        :style="{ background: c.hex }"
        :title="`点击复制 ${c.hex}`"
        @click="copy('pal-' + i, c.hex)"
      >
        <span class="pal-hex">{{ c.hex.toUpperCase() }}</span>
        <span class="pal-ratio">{{ (c.ratio * 100).toFixed(1) }}%<template v-if="copiedKey === 'pal-' + i"> · 已复制</template></span>
      </button>
    </div>

    <div class="preview-wrap" style="margin-top: 14px">
      <img :src="previewUrl" class="preview" alt="原图预览" />
    </div>
    <p class="tip" style="margin-top: 10px">
      按 RGB 每 4 位一档量化分桶统计,占比为该主色覆盖的像素比例;统计完全在本地进行,图片不上传。
      做设计取色时可配合「颜色吸取器」精确取某个像素。
    </p>
  </template>
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
.dropzone p {
  margin: 4px 0;
}
.ctrl {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.count-input {
  width: 100px;
}
.pal-list {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.pal-swatch {
  flex: 1 1 120px;
  min-width: 120px;
  min-height: 88px;
  border-radius: 12px;
  border: 1px solid var(--border);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: flex-start;
  padding: 10px;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.55);
  transition: transform 0.12s;
}
.pal-swatch:hover {
  transform: translateY(-2px);
}
.pal-hex {
  font-family: var(--mono);
  font-size: 14.5px;
  font-weight: 700;
}
.pal-ratio {
  font-family: var(--mono);
  font-size: 12px;
  opacity: 0.9;
}
.preview-wrap {
  display: flex;
  justify-content: center;
  border-radius: 8px;
  padding: 12px;
  background: var(--bg-soft);
}
.preview {
  max-width: 100%;
  max-height: 300px;
}
</style>
