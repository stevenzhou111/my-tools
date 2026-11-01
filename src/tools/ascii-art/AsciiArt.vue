<script setup>
import AppIcon from '@/components/AppIcon.vue'
import { ref } from 'vue'
import { useCopy } from '@/utils/useCopy'

const fileInput = ref(null)
const img = ref(null)
const fileName = ref('')
const cols = ref(100)
const invert = ref(false)
const charsetId = ref('std')
const output = ref('')
const error = ref('')
const { copiedKey, copy } = useCopy()

const CHARSETS = {
  std: { label: '标准 10 级', chars: '@%#*+=-:. ' },
  fine: { label: '细致 70 级', chars: "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'. " },
  block: { label: '块状阴影', chars: '█▓▒░ ' },
}
const MAX_COLS = 240

function pick() {
  fileInput.value?.click()
}
function onFileChange(e) {
  const f = e.target.files?.[0]
  e.target.value = ''
  if (f) load(f)
}
function onDrop(e) {
  const f = e.dataTransfer?.files?.[0]
  if (f) load(f)
}

function load(f) {
  error.value = ''
  const url = URL.createObjectURL(f)
  const image = new Image()
  image.onload = () => {
    URL.revokeObjectURL(url)
    img.value = image
    fileName.value = f.name
    render()
  }
  image.onerror = () => {
    URL.revokeObjectURL(url)
    error.value = '无法读取该图片'
  }
  image.src = url
}

// 字符高约是宽的 2 倍,行数按 0.5 系数压缩才不会把图拉长
function render() {
  const image = img.value
  if (!image) return
  const c = Math.min(MAX_COLS, Math.max(20, Math.floor(cols.value)))
  const rows = Math.max(1, Math.round((c * image.naturalHeight) / image.naturalWidth / 2))
  const canvas = document.createElement('canvas')
  canvas.width = c
  canvas.height = rows
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(image, 0, 0, c, rows)
  const { data } = ctx.getImageData(0, 0, c, rows)
  const chars = CHARSETS[charsetId.value].chars
  const ramp = invert.value ? [...chars].reverse().join('') : chars
  const maxIdx = ramp.length - 1
  let text = ''
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < c; x++) {
      const i = (y * c + x) * 4
      // ITU-R BT.601 亮度;透明处按白底处理
      const a = data[i + 3] / 255
      const lum = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) * a + 255 * (1 - a)
      text += ramp[Math.round((lum / 255) * maxIdx)]
    }
    text += '\n'
  }
  output.value = text
}

function download() {
  const blob = new Blob([output.value], { type: 'text/plain;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = (fileName.value.replace(/\.[^.]+$/, '') || 'ascii') + '.txt'
  a.click()
  URL.revokeObjectURL(a.href)
}
</script>

<template>
  <p class="tip" style="margin-bottom: 14px">
    把图片转成字符画:按亮度映射到字符梯度,复制或下载为纯文本,贴进 README、代码注释或弹幕都行。全部本地转换。
  </p>

  <div class="dropzone" @click="pick" @dragover.prevent @drop.prevent="onDrop">
    <input ref="fileInput" type="file" accept="image/*" class="sr-only" @change="onFileChange" />
    <div class="dz-icon"><AppIcon name="type" :size="30" /></div>
    <p v-if="!img"><strong>点击选择图片</strong> 或拖拽到此处</p>
    <p v-else>{{ fileName }} · {{ img.naturalWidth }}×{{ img.naturalHeight }}</p>
  </div>

  <div v-if="error" class="error-box" style="margin-top: 12px">✗ {{ error }}</div>

  <template v-if="img">
    <div class="row mt-12">
      <label class="ctrl">
        <span class="field-label">宽度 {{ cols }} 字符</span>
        <input v-model.number="cols" type="range" min="20" max="240" @input="render" />
      </label>
      <label class="ctrl">
        <span class="field-label" for="ascii-charset">字符梯度</span>
        <select id="ascii-charset" v-model="charsetId" class="select" @change="render">
          <option v-for="(v, k) in CHARSETS" :key="k" :value="k">{{ v.label }}</option>
        </select>
      </label>
      <label class="check"><input v-model="invert" type="checkbox" @change="render" />反相(深色背景适用)</label>
    </div>

    <pre class="output ascii-pre">{{ output }}</pre>
    <div class="row mt-10">
      <button class="btn btn-sm" @click="copy('ascii', output)">{{ copiedKey === 'ascii' ? '✓ 已复制' : '复制字符画' }}</button>
      <button class="btn btn-sm" @click="download">⬇️ 下载 .txt</button>
      <span class="tip">{{ output.split('\n')[0]?.length }}×{{ output.split('\n').length - 1 }} 字符</span>
    </div>
  </template>
</template>

<style scoped>
.dropzone {
  border: 2px dashed var(--border);
  border-radius: var(--radius);
  padding: 36px 20px;
  text-align: center;
  cursor: pointer;
  color: var(--muted);
}
.dropzone:hover {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.dz-icon {
  font-size: 36px;
  margin-bottom: 6px;
}
.dropzone p { margin: 4px 0; }
.ascii-pre {
  margin-top: 12px;
  font-size: 9px;
  line-height: 1.05;
  max-height: 460px;
  user-select: all;
}
</style>
