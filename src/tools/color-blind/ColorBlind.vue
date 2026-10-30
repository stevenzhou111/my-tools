<script setup>
import { computed, onUnmounted, ref } from 'vue'
import { downloadCanvas } from '@/utils/image'

const TYPES = [
  {
    id: 'protanopia',
    label: '红色盲(P 型)',
    // Machado et al. 2009 线性 RGB 近似矩阵
    m: [0.152286, 1.194679, -0.346965, 0.114503, 0.855495, 0.030003, -0.002449, -0.051377, 1.053826],
  },
  {
    id: 'deuteranopia',
    label: '绿色盲(D 型,最常见)',
    m: [0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.01182, 0.04294, 0.968881],
  },
  {
    id: 'tritanopia',
    label: '蓝黄色盲(T 型)',
    m: [1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733, 0.691367, 0.3039],
  },
  {
    id: 'achromatopsia',
    label: '全色盲(单色视觉)',
    m: [0.299, 0.587, 0.114, 0.299, 0.587, 0.114, 0.299, 0.587, 0.114],
  },
]

const fileInput = ref(null)
const img = ref(null)
const active = ref('deuteranopia')
const hex = ref('#6366f1')
const canvasEls = {}
const error = ref('')

const rgb = computed(() => {
  const n = parseInt(hex.value.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
})

function pick() {
  fileInput.value?.click()
}
function onFileChange(e) {
  const f = e.target.files?.[0]
  e.target.value = ''
  if (!f) return
  const url = URL.createObjectURL(f)
  const image = new Image()
  image.onload = () => {
    URL.revokeObjectURL(url)
    img.value = image
    renderAll()
  }
  image.onerror = () => {
    URL.revokeObjectURL(url)
    error.value = '无法读取该图片'
  }
  image.src = url
}

function applyMatrix(data, m) {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    data[i] = r * m[0] + g * m[1] + b * m[2]
    data[i + 1] = r * m[3] + g * m[4] + b * m[5]
    data[i + 2] = r * m[6] + g * m[7] + b * m[8]
  }
}

function renderInto(canvas, sourceImg, m) {
  const MAX_DIM = 1200
  const scale = Math.min(1, MAX_DIM / Math.max(sourceImg.naturalWidth, sourceImg.naturalHeight))
  const w = Math.max(1, Math.round(sourceImg.naturalWidth * scale))
  const h = Math.max(1, Math.round(sourceImg.naturalHeight * scale))
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(sourceImg, 0, 0, w, h)
  const imageData = ctx.getImageData(0, 0, w, h)
  applyMatrix(imageData.data, m)
  ctx.putImageData(imageData, 0, 0)
}

function renderAll() {
  if (!img.value) return
  for (const t of TYPES) {
    const canvas = canvasEls[t.id]
    if (canvas) renderInto(canvas, img.value, t.m)
  }
}

function canvasFor(id) {
  return (el) => {
    if (el) canvasEls[id] = el
  }
}

function download(id) {
  const c = canvasEls[id]
  if (c) downloadCanvas(c, `color-blind-${id}.png`, 'image/png')
}

function hexText(id) {
  const t = TYPES.find((x) => x.id === id)
  const [r, g, b] = rgb.value
  const v = [
    r * t.m[0] + g * t.m[1] + b * t.m[2],
    r * t.m[3] + g * t.m[4] + b * t.m[5],
    r * t.m[6] + g * t.m[7] + b * t.m[8],
  ].map((x) => Math.max(0, Math.min(255, Math.round(x))))
  return '#' + v.map((x) => x.toString(16).padStart(2, '0')).join('')
}

onUnmounted(() => {
  img.value = null
})
</script>

<template>
  <p class="tip" style="margin-bottom: 14px">
    模拟色觉障碍用户看到的效果,检查界面配色是否仍有足够区分度:输入单个颜色立即得到四种色觉下的色值;上传图片(如界面截图)可整图模拟并下载。矩阵采用 Machado et al. (2009) 线性 RGB 近似。
  </p>

  <div class="row" style="margin-bottom: 12px; flex-wrap: wrap">
    <label class="ctrl">
      <span class="field-label">颜色</span>
      <input v-model="hex" type="color" class="input color-input" style="width: 46px" aria-label="选择颜色" />
      <input v-model="hex" class="input mono" style="width: 110px" spellcheck="false" />
    </label>
    <label class="ctrl">
      <span class="field-label">上传图片模拟</span>
      <button class="btn" @click="pick">{{ img ? '更换图片' : '选择图片' }}</button>
      <input ref="fileInput" type="file" accept="image/*" class="sr-only" @change="onFileChange" />
    </label>
  </div>

  <div class="swatch-row">
    <div class="swatch-item">
      <span class="sw" :style="{ background: hex }"></span>
      <span class="tip">正常视觉 {{ hex }}</span>
    </div>
    <div v-for="t in TYPES" :key="t.id" class="swatch-item">
      <span class="sw" :style="{ background: hexText(t.id) }"></span>
      <span class="tip">{{ t.label }} {{ hexText(t.id) }}</span>
    </div>
  </div>

  <div v-if="error" class="error-box mt-12">✗ {{ error }}</div>

  <div v-if="img" class="mt-14">
    <div class="row" style="margin-bottom: 10px; flex-wrap: wrap; gap: 10px">
      <button
        v-for="t in TYPES"
        :key="t.id"
        class="btn btn-sm"
        :class="{ 'btn-primary': active === t.id }"
        @click="active = t.id"
      >
        {{ t.label }}
      </button>
      <button class="btn btn-sm" @click="download(active)">⬇️ 下载当前图</button>
    </div>
    <div v-for="t in TYPES" v-show="active === t.id" :key="t.id" class="panel" style="padding: 8px">
      <canvas :ref="canvasFor(t.id)" style="max-width: 100%" role="img" :aria-label="t.label + '模拟'"></canvas>
    </div>
  </div>
</template>

<style scoped>
.color-input {
  padding: 2px;
  cursor: pointer;
}
.swatch-row {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}
.swatch-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.sw {
  width: 84px;
  height: 56px;
  border-radius: 10px;
  border: 1px solid var(--border);
}
</style>
