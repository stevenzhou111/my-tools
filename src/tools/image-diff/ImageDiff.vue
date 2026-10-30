<script setup>
import { onUnmounted, ref } from 'vue'
import { downloadCanvas } from '@/utils/image'

const MAX_DIM = 2048

const inputA = ref(null)
const inputB = ref(null)
const imgA = ref(null)
const imgB = ref(null)
const nameA = ref('')
const nameB = ref('')
const threshold = ref(12)
const error = ref('')
const diffPct = ref(null)
const diffCount = ref(0)
const canvasEl = ref(null)
const busy = ref(false)

function pick(which) {
  which === 'a' ? inputA.value?.click() : inputB.value?.click()
}
function onFile(which, e) {
  const f = e.target.files?.[0]
  e.target.value = ''
  if (f) load(which, f)
}
function onDrop(which, e) {
  const f = e.dataTransfer?.files?.[0]
  if (f) load(which, f)
}

function loadImageFromFile(f) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(f)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('无法读取该图片'))
    }
    img.src = url
  })
}

async function load(which, f) {
  error.value = ''
  try {
    const img = await loadImageFromFile(f)
    if (which === 'a') {
      imgA.value = img
      nameA.value = f.name
    } else {
      imgB.value = img
      nameB.value = f.name
    }
    diffPct.value = null
    await nextFrame(render)
  } catch (e) {
    error.value = e.message
  }
}

function nextFrame(fn) {
  return new Promise((res) => requestAnimationFrame(() => res(fn())))
}

function drawToCanvas(img, w, h) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, 0, 0, w, h)
  return ctx.getImageData(0, 0, w, h)
}

async function render() {
  const a = imgA.value
  const b = imgB.value
  const canvas = canvasEl.value
  if (!a || !b || !canvas) return
  if (a.naturalWidth !== b.naturalWidth || a.naturalHeight !== b.naturalHeight) {
    error.value = `两张图片尺寸不同(A 为 ${a.naturalWidth}×${a.naturalHeight},B 为 ${b.naturalWidth}×${b.naturalHeight}),请使用同一尺寸的图片(如同一页面的前后两次截图)`
    return
  }
  error.value = ''
  busy.value = true
  try {
    // 内存防线:超长边压到 2048 再逐像素比较
    const scale = Math.min(1, MAX_DIM / Math.max(a.naturalWidth, a.naturalHeight))
    const w = Math.max(1, Math.round(a.naturalWidth * scale))
    const h = Math.max(1, Math.round(a.naturalHeight * scale))
    const da = drawToCanvas(a, w, h)
    const db = drawToCanvas(b, w, h)
    const pa = da.data
    const pb = db.data
    const out = new ImageData(w, h)
    const po = out.data
    // 差异处标红;未变处压暗成灰,让变化区域一眼可见
    let count = 0
    for (let i = 0; i < pa.length; i += 4) {
      const d = Math.max(
        Math.abs(pa[i] - pb[i]),
        Math.abs(pa[i + 1] - pb[i + 1]),
        Math.abs(pa[i + 2] - pb[i + 2]),
      )
      const gray = (pa[i] * 299 + pa[i + 1] * 587 + pa[i + 2] * 114) / 1000
      if (d > threshold.value) {
        count++
        po[i] = 220
        po[i + 1] = 38
        po[i + 2] = 38
      } else {
        po[i] = po[i + 1] = po[i + 2] = gray * 0.25 + 255 * 0.75
      }
      po[i + 3] = 255
    }
    diffCount.value = count
    diffPct.value = (count / ((w * h) || 1)) * 100
    const ctx = canvas.getContext('2d')
    canvas.width = w
    canvas.height = h
    ctx.putImageData(out, 0, 0)
  } finally {
    busy.value = false
  }
}

function download() {
  if (canvasEl.value) downloadCanvas(canvasEl.value, 'image-diff.png', 'image/png')
}

onUnmounted(() => {
  imgA.value = null
  imgB.value = null
})
</script>

<template>
  <p class="tip" style="margin-bottom: 14px">
    上传两张<b>同尺寸</b>图片(如 UI 改版前后的截图),逐像素比较并把差异区域标红;红色越密集说明改动越多。全部在本地计算,图片不会上传。
  </p>

  <div class="row" style="margin-bottom: 12px">
    <div class="dropzone" style="flex: 1" @click="pick('a')" @dragover.prevent @drop.prevent="onDrop('a', $event)">
      <input ref="inputA" type="file" accept="image/*" class="sr-only" @change="onFile('a', $event)" />
      <p v-if="!nameA"><strong>图 A</strong> 点击选择 / 拖拽</p>
      <p v-else>✓ {{ nameA }}</p>
    </div>
    <div class="dropzone" style="flex: 1" @click="pick('b')" @dragover.prevent @drop.prevent="onDrop('b', $event)">
      <input ref="inputB" type="file" accept="image/*" class="sr-only" @change="onFile('b', $event)" />
      <p v-if="!nameB"><strong>图 B</strong> 点击选择 / 拖拽</p>
      <p v-else>✓ {{ nameB }}</p>
    </div>
  </div>

  <div v-if="error" class="error-box" style="margin-bottom: 12px">✗ {{ error }}</div>

  <div v-if="imgA && imgB" class="row">
    <label class="ctrl">
      <span class="field-label">差异阈值({{ threshold }},越大越宽容)</span>
      <input v-model.number="threshold" type="range" min="1" max="100" @input="render" />
    </label>
    <button class="btn btn-primary" :disabled="busy" @click="download">⬇️ 下载差异图</button>
  </div>

  <div v-if="diffPct !== null" class="panel mt-12">
    <div class="row" style="flex-wrap: wrap; gap: 16px">
      <strong :style="{ color: diffPct > 0 ? 'var(--danger)' : 'var(--success)' }">
        {{ diffPct > 0 ? `发现 ${diffPct.toFixed(2)}% 像素存在差异` : '两张图片一致' }}
      </strong>
      <span class="tip">差异像素 {{ diffCount.toLocaleString() }} 个</span>
    </div>
    <div class="preview-wrap mt-12">
      <canvas ref="canvasEl" class="diff-canvas" role="img" aria-label="像素差异热区图"></canvas>
    </div>
  </div>
</template>

<style scoped>
.dropzone {
  border: 2px dashed var(--border);
  border-radius: var(--radius);
  padding: 26px 16px;
  text-align: center;
  cursor: pointer;
  color: var(--muted);
}
.dropzone:hover {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.dropzone p { margin: 4px 0; }
.preview-wrap {
  max-height: 480px;
  overflow: auto;
  text-align: center;
  background: var(--bg-soft);
  border-radius: 10px;
  padding: 8px;
}
.diff-canvas {
  max-width: 100%;
  image-rendering: pixelated;
}
</style>
