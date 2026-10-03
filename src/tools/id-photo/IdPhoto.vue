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
const tolerance = ref(60)
const preset = ref('#ffffff')
const customColor = ref('#438edb')

const PRESETS = [
  { id: '#ffffff', name: '白色', css: '#ffffff' },
  { id: '#438edb', name: '蓝色', css: '#438edb' },
  { id: '#be0011', name: '红色', css: '#be0011' },
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
const originalUrl = ref('')

async function load(file) {
  error.value = ''
  if (!file.type.startsWith('image/')) return (error.value = '请选择图片文件')
  fileName.value = file.name
  try {
    const img = await loadImageFromFile(file)
    image.value = img
    // loadImageFromFile 会 revoke 其内部 URL,这里自建一个供对比视图长期使用
    const own = URL.createObjectURL(file)
    if (originalUrl.value) URL.revokeObjectURL(originalUrl.value)
    originalUrl.value = own
    render()
  } catch (e) {
    error.value = e.message
  }
}

onUnmounted(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  if (originalUrl.value) URL.revokeObjectURL(originalUrl.value)
})

// 从四角与上边中点采样背景色(取平均);坐标限制在图内,防小图越界
function sampleBackground(data, w, h) {
  const clamp = (v, max) => Math.max(0, Math.min(v, max))
  const spots = [
    [2, 2], [w - 12, 2], [2, h - 12], [w - 12, h - 12],
    [Math.floor(w / 2) - 5, 2], [Math.floor(w / 2) - 5, h - 12],
  ].map(([x, y]) => [clamp(x, w - 11), clamp(y, h - 11)])
  let r = 0
  let g = 0
  let b = 0
  let n = 0
  for (const [x, y] of spots) {
    for (let dy = 0; dy < 10; dy++) {
      for (let dx = 0; dx < 10; dx++) {
        const i = ((y + dy) * w + (x + dx)) * 4
        r += data[i]
        g += data[i + 1]
        b += data[i + 2]
        n++
      }
    }
  }
  return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) }
}

function compose() {
  const img = image.value
  if (!img) return null
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, 0, 0)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const d = imageData.data
  const bg = sampleBackground(d, canvas.width, canvas.height)
  const target = preset.value === 'custom' ? hexToRgb(customColor.value) : hexToRgb(preset.value)
  const soft = tolerance.value * 1.4
  for (let i = 0; i < d.length; i += 4) {
    const dist = Math.sqrt((d[i] - bg.r) ** 2 + (d[i + 1] - bg.g) ** 2 + (d[i + 2] - bg.b) ** 2)
    if (dist < tolerance.value) {
      // 完全在容差内:直接替换
      d[i] = target.r
      d[i + 1] = target.g
      d[i + 2] = target.b
    } else if (dist < soft) {
      // 过渡带:按比例混合,柔化头发等边缘
      const t = (dist - tolerance.value) / (soft - tolerance.value)
      d[i] = Math.round(target.r * (1 - t) + d[i] * t)
      d[i + 1] = Math.round(target.g * (1 - t) + d[i + 1] * t)
      d[i + 2] = Math.round(target.b * (1 - t) + d[i + 2] * t)
    }
  }
  ctx.putImageData(imageData, 0, 0)
  return canvas
}

function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  }
}

function render() {
  const canvas = compose()
  if (!canvas) return
  const old = previewUrl.value
  canvas.toBlob((b) => {
    if (!b) return
    previewUrl.value = URL.createObjectURL(b)
    if (old) URL.revokeObjectURL(old)
  }, 'image/png')
}

watch([tolerance, preset, customColor], debounce(render, 200))

function download() {
  const canvas = compose()
  if (canvas) downloadCanvas(canvas, fileName.value.replace(/\.[^.]+$/, '') + '-证件照.png', 'image/png')
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
      <div class="dz-icon">🪪</div>
      <p><strong>点击选择证件照</strong> 或拖拽到此处</p>
      <p class="tip">自动识别纯色背景(白/蓝/红)并替换;⚠️ 适合背景均匀的证件照</p>
    </div>
    <p v-else class="tip">点击或拖拽可更换图片</p>
  </div>

  <div v-if="error" class="error-box" style="margin-top: 12px">✗ {{ error }}</div>

  <div v-if="image" class="panel" style="margin-top: 14px">
    <div class="row" style="margin-bottom: 14px">
      <label class="ctrl-inline">
        目标背景
        <button
          v-for="p in PRESETS"
          :key="p.id"
          class="btn btn-sm preset-btn"
          :class="{ active: preset === p.id }"
          @click="preset = p.id"
        >
          <span class="dot" :style="{ background: p.css }"></span>{{ p.name }}
        </button>
        <label class="ctrl-inline">
          <input v-model="preset" type="radio" value="custom" class="sr-radio" />自定义
          <input v-model="customColor" type="color" class="input color-input" @click="preset = 'custom'" />
        </label>
      </label>
      <label class="ctrl-inline">
        容差 <strong>{{ tolerance }}</strong>
        <input v-model.number="tolerance" type="range" min="20" max="140" step="5" />
      </label>
    </div>
    <p class="tip" style="margin-bottom: 12px">
      容差越小,替换范围越严格(边缘残留越多);越大,替换越彻底(但可能误伤与背景色接近的衣服/头发)。
    </p>
    <div class="compare" v-if="previewUrl">
      <div>
        <img :src="originalUrl" class="photo" alt="原图" />
        <span class="tip">原图</span>
      </div>
      <div>
        <img :src="previewUrl" class="photo" alt="换背景后" />
        <span class="tip">换背景后</span>
      </div>
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
.ctrl-inline {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14.5px;
}
.preset-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.preset-btn.active {
  border-color: var(--accent);
  color: var(--accent);
}
.dot {
  width: 13px;
  height: 13px;
  border-radius: 50%;
  border: 1px solid var(--border);
}
.sr-radio {
  display: none;
}
.color-input {
  width: 42px;
  height: 32px;
  padding: 2px;
}
.compare {
  display: flex;
  gap: 20px;
  justify-content: center;
  align-items: flex-end;
}
.compare > div {
  text-align: center;
  display: grid;
  gap: 6px;
}
.photo {
  max-height: 320px;
  max-width: 100%;
  border-radius: 8px;
  border: 1px solid var(--border);
  background:
    linear-gradient(45deg, var(--bg-soft) 25%, transparent 25%, transparent 75%, var(--bg-soft) 75%),
    linear-gradient(45deg, var(--bg-soft) 25%, transparent 25%, transparent 75%, var(--bg-soft) 75%);
  background-size: 16px 16px;
  background-position: 0 0, 8px 8px;
}
</style>
