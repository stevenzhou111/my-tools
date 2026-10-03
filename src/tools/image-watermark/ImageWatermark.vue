<script setup>
import { onUnmounted, ref, watch } from 'vue'
import { downloadCanvas, loadImageFromFile } from '@/utils/image'
import { debounce } from '@/utils/format'

const fileInput = ref(null)
const logoInput = ref(null)
const dragging = ref(false)
const image = ref(null)
const fileName = ref('')
const error = ref('')
const previewUrl = ref('')

const type = ref('text') // text | image
const text = ref('@ 我的水印')
const fontSize = ref(28)
const color = ref('#ffffff')
const opacity = ref(0.5)
const rotation = ref(-30)
const layout = ref('tile') // tile 平铺 | corner 九宫格
const corner = ref('bottom-right')
const logoScale = ref(20)

let logoImg = null

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

function onLogoChange(e) {
  const f = e.target.files?.[0]
  if (!f) return
  loadImageFromFile(f)
    .then((img) => {
      logoImg = img
      type.value = 'image'
      render()
    })
    .catch((err) => (error.value = err.message))
  e.target.value = ''
}

const POSITIONS = ['top-left', 'top-center', 'top-right', 'middle-left', 'middle-center', 'middle-right', 'bottom-left', 'bottom-center', 'bottom-right']

// 九宫格位置 → 元素左上角坐标(统一解析,修正 middle/center 错位)
function cornerXY(w, h, W, H, pad) {
  const [vyRaw, vxRaw] = corner.value.split('-')
  const vy = vyRaw === 'center' ? 'middle' : vyRaw
  const vx = vxRaw ?? 'center'
  const x = vx === 'left' ? pad : vx === 'center' ? (W - w) / 2 : W - w - pad
  const y = vy === 'top' ? pad : vy === 'middle' ? (H - h) / 2 : H - h - pad
  return { x, y }
}

function drawWatermark(ctx, W, H) {
  ctx.save()
  ctx.globalAlpha = opacity.value
  if (type.value === 'text') {
    ctx.font = `600 ${fontSize.value}px system-ui, 'Microsoft YaHei', sans-serif`
    ctx.fillStyle = color.value
    const metrics = ctx.measureText(text.value || ' ')
    const tw = metrics.width
    const th = fontSize.value
    if (layout.value === 'tile') {
      ctx.rotate((rotation.value * Math.PI) / 180)
      const stepX = tw + 120
      const stepY = th + 100
      const diag = Math.sqrt(W * W + H * H)
      for (let y = -diag; y < diag; y += stepY) {
        for (let x = -diag; x < diag; x += stepX) {
          ctx.fillText(text.value, x, y)
        }
      }
    } else {
      const { x, y } = cornerXY(tw, th, W, H, 24)
      ctx.textBaseline = 'top'
      ctx.translate(x + tw / 2, y + th / 2)
      ctx.rotate((rotation.value * Math.PI) / 180)
      ctx.fillText(text.value, -tw / 2, -th / 2)
    }
  } else if (type.value === 'image' && logoImg) {
    const lw = (W * logoScale.value) / 100
    const lh = (logoImg.naturalHeight / logoImg.naturalWidth) * lw
    if (layout.value === 'tile') {
      ctx.rotate((rotation.value * Math.PI) / 180)
      const stepX = lw + 140
      const stepY = lh + 120
      const diag = Math.sqrt(W * W + H * H)
      for (let y = -diag; y < diag; y += stepY) {
        for (let x = -diag; x < diag; x += stepX) {
          ctx.drawImage(logoImg, x, y, lw, lh)
        }
      }
    } else {
      const { x, y } = cornerXY(lw, lh, W, H, 24)
      ctx.translate(x + lw / 2, y + lh / 2)
      ctx.rotate((rotation.value * Math.PI) / 180)
      ctx.drawImage(logoImg, -lw / 2, -lh / 2, lw, lh)
    }
  }
  ctx.restore()
}

function compose() {
  const img = image.value
  if (!img) return null
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0)
  drawWatermark(ctx, canvas.width, canvas.height)
  return canvas
}

function render() {
  const canvas = compose()
  if (!canvas) return
  // 先持有旧 URL,新图就绪后再释放,避免预览短暂破图
  const old = previewUrl.value
  canvas.toBlob((b) => {
    if (!b) return
    previewUrl.value = URL.createObjectURL(b)
    if (old) URL.revokeObjectURL(old)
  }, 'image/png')
}

watch([text, fontSize, color, opacity, rotation, layout, corner, logoScale, type], debounce(render, 200))

onUnmounted(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})

function download() {
  const canvas = compose()
  if (canvas) downloadCanvas(canvas, fileName.value.replace(/\.[^.]+$/, '') + '-watermark.png', 'image/png')
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
      <div class="dz-icon">💧</div>
      <p><strong>点击选择图片</strong> 或拖拽到此处</p>
      <p class="tip">支持文字水印(可平铺防盗图)与 Logo 图片水印</p>
    </div>
    <p v-else class="tip">点击或拖拽可更换图片</p>
  </div>

  <div v-if="error" class="error-box" style="margin-top: 12px">✗ {{ error }}</div>

  <div v-if="image" class="panel" style="margin-top: 14px">
    <div class="row" style="margin-bottom: 12px">
      <label class="check"><input v-model="type" type="radio" value="text" />文字水印</label>
      <label class="check"><input v-model="type" type="radio" value="image" />图片水印</label>
      <button v-if="type === 'image'" class="btn btn-sm" @click="logoInput.click()">
        {{ logoImg ? '更换 Logo' : '选择 Logo 图片' }}
      </button>
      <input ref="logoInput" type="file" accept="image/*" hidden @change="onLogoChange" />
    </div>

    <div class="row" style="margin-bottom: 12px">
      <template v-if="type === 'text'">
        <label class="ctrl" style="flex: 1; min-width: 180px">
          <span class="field-label">水印文字</span>
          <input v-model="text" class="input" spellcheck="false" />
        </label>
        <label class="ctrl">
          <span class="field-label">字号 {{ fontSize }}</span>
          <input v-model.number="fontSize" type="range" min="12" max="96" />
        </label>
        <label class="ctrl">
          <span class="field-label">颜色</span>
          <input v-model="color" type="color" class="input color-input" />
        </label>
      </template>
      <template v-if="type === 'image'">
        <label class="ctrl">
          <span class="field-label">Logo 宽度占比 {{ logoScale }}%</span>
          <input v-model.number="logoScale" type="range" min="5" max="60" />
        </label>
      </template>
      <label class="ctrl">
        <span class="field-label">不透明度 {{ Math.round(opacity * 100) }}%</span>
        <input v-model.number="opacity" type="range" min="0.05" max="1" step="0.05" />
      </label>
      <label class="ctrl">
        <span class="field-label">旋转 {{ rotation }}°</span>
        <input v-model.number="rotation" type="range" min="-90" max="90" step="15" />
      </label>
    </div>

    <div class="row" style="margin-bottom: 12px">
      <label class="check"><input v-model="layout" type="radio" value="tile" />平铺全图(防盗图)</label>
      <label class="check"><input v-model="layout" type="radio" value="corner" />单个位置</label>
      <div v-if="layout === 'corner'" class="grid9">
        <button
          v-for="p in POSITIONS"
          :key="p"
          class="g9-cell"
          :class="{ active: corner === p }"
          @click="corner = p"
        ></button>
      </div>
    </div>

    <img v-if="previewUrl" :src="previewUrl" class="preview" alt="水印预览" />
  </div>

  <div v-if="previewUrl" class="row" style="margin-top: 14px">
    <button class="btn btn-primary" @click="download">⬇️ 下载加水印的图片</button>
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
  min-width: 160px;
}
.color-input {
  width: 52px;
  height: 38px;
  padding: 2px;
}
.grid9 {
  display: grid;
  grid-template-columns: repeat(3, 26px);
  gap: 4px;
  align-self: center;
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
.preview {
  max-width: 100%;
  max-height: 400px;
  border-radius: 8px;
}
</style>
