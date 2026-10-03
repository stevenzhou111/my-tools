<script setup>
import { ref } from 'vue'
import { loadImageFromFile } from '@/utils/image'
import { zipSync } from 'fflate'
import { downloadBlob } from '@/utils/image'

const fileInput = ref(null)
const dragging = ref(false)
const image = ref(null)
const fileName = ref('')
const error = ref('')
const square = ref(true)
const tiles = ref([]) // { url, row, col, canvas }
const busy = ref(false)

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
  tiles.value = []
  if (!file.type.startsWith('image/')) return (error.value = '请选择图片文件')
  fileName.value = file.name
  try {
    image.value = await loadImageFromFile(file)
    cut()
  } catch (e) {
    error.value = e.message
  }
}

function cut() {
  const img = image.value
  if (!img) return
  busy.value = true
  try {
    // 可选先居中裁成正方形(社交平台九宫格的标准做法)
    let sx = 0
    let sy = 0
    let sw = img.naturalWidth
    let sh = img.naturalHeight
    if (square.value && sw !== sh) {
      const side = Math.min(sw, sh)
      sx = (sw - side) / 2
      sy = (sh - side) / 2
      sw = sh = side
    }
    const tw = Math.floor(sw / 3)
    const th = Math.floor(sh / 3)
    if (tw < 1 || th < 1) {
      busy.value = false
      return (error.value = '图片太小,无法切分,请使用更大的图片')
    }
    const out = []
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const canvas = document.createElement('canvas')
        canvas.width = tw
        canvas.height = th
        canvas
          .getContext('2d')
          .drawImage(img, sx + c * tw, sy + r * th, tw, th, 0, 0, tw, th)
        out.push({ canvas, row: r, col: c, url: canvas.toDataURL('image/png') })
      }
    }
    tiles.value = out
    busy.value = false
  } catch (e) {
    error.value = '切图失败:' + e.message
    busy.value = false
  }
}

function downloadZip() {
  if (!tiles.value.length) return
  const entries = {}
  // 微信/微博九宫格发布顺序:从左到右、从上到下编号 1-9
  tiles.value.forEach((t, i) => {
    entries[`${fileName.value.replace(/\.[^.]+$/, '')}-${i + 1}.png`] = dataUrlToBytes(t.url)
  })
  downloadBlob(new Blob([zipSync(entries)], { type: 'application/zip' }), fileName.value.replace(/\.[^.]+$/, '') + '-九宫格.zip')
}

function dataUrlToBytes(dataUrl) {
  const b64 = dataUrl.split(',')[1]
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
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
      <div class="dz-icon">⊞</div>
      <p><strong>点击选择图片</strong> 或拖拽到此处</p>
      <p class="tip">切成 3×3 九张图,按发布顺序编号,打包 ZIP</p>
    </div>
    <p v-else class="tip">点击或拖拽可更换图片</p>
  </div>

  <div v-if="error" class="error-box" style="margin-top: 12px">✗ {{ error }}</div>

  <div v-if="image" class="panel" style="margin-top: 14px">
    <div class="row" style="margin-bottom: 12px">
      <label class="check">
        <input v-model="square" type="checkbox" @change="cut" />
        先居中裁成正方形(微信/微博九宫格标准)
      </label>
      <button class="btn btn-primary btn-sm" :disabled="!tiles.length || busy" @click="downloadZip">⬇️ 下载 9 张图(ZIP)</button>
    </div>
    <div class="grid3">
      <div v-for="(t, i) in tiles" :key="i" class="tile">
        <img :src="t.url" :alt="'第' + (i + 1) + '块'" />
        <span class="tile-no">{{ i + 1 }}</span>
      </div>
    </div>
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
.grid3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  max-width: 480px;
  margin: 0 auto;
}
.tile {
  position: relative;
}
.tile img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid var(--border);
}
.tile-no {
  position: absolute;
  left: 6px;
  top: 6px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
