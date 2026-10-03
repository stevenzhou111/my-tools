<script setup>
import { ref } from 'vue'
import { PDFDocument } from 'pdf-lib'
import { downloadBlob } from '@/utils/image'

const fileInput = ref(null)
const items = ref([]) // { file, url, w, h, type }
const busy = ref(false)
const error = ref('')

function pick() {
  fileInput.value?.click()
}
function onFileChange(e) {
  for (const f of e.target.files || []) add(f)
  e.target.value = ''
}
function onDrop(e) {
  for (const f of e.dataTransfer?.files || []) add(f)
}
async function add(file) {
  error.value = ''
  if (!file.type.startsWith('image/')) return (error.value = `「${file.name}」不是图片文件`)
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('无法读取该图片'))
      el.src = url
    })
    items.value.push({ file, url, w: img.naturalWidth, h: img.naturalHeight, img })
  } catch (e) {
    URL.revokeObjectURL(url)
    error.value = e.message
  }
}
function remove(index) {
  const it = items.value[index]
  URL.revokeObjectURL(it.url)
  items.value.splice(index, 1)
}
function move(index, delta) {
  const target = index + delta
  if (target < 0 || target >= items.value.length) return
  const arr = items.value
  ;[arr[index], arr[target]] = [arr[target], arr[index]]
}
function clearAll() {
  items.value.forEach((it) => URL.revokeObjectURL(it.url))
  items.value = []
}

async function convert() {
  error.value = ''
  if (!items.value.length) return (error.value = '请先添加图片')
  busy.value = true
  try {
    const doc = await PDFDocument.create()
    for (const it of items.value) {
      let bytes = await it.file.arrayBuffer()
      let type = it.file.type
      if (type !== 'image/png' && type !== 'image/jpeg') {
        // WebP 等格式先转成 JPEG 再嵌入;先铺白底,避免透明区域在 JPEG 中变黑
        const canvas = document.createElement('canvas')
        canvas.width = it.w
        canvas.height = it.h
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(it.img, 0, 0)
        const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.92))
        bytes = await blob.arrayBuffer()
        type = 'image/jpeg'
      }
      const embedded = type === 'image/png' ? await doc.embedPng(bytes) : await doc.embedJpg(bytes)
      const page = doc.addPage([embedded.width, embedded.height])
      page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height })
    }
    downloadBlob(new Blob([await doc.save()], { type: 'application/pdf' }), 'images.pdf')
  } catch (e) {
    error.value = '转换失败:' + e.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="dropzone" @click="pick" @dragover.prevent @drop.prevent="onDrop">
    <input ref="fileInput" type="file" accept="image/*" multiple hidden @change="onFileChange" />
    <div class="dz-icon">🖨️</div>
    <p><strong>点击选择图片</strong> 或拖拽多张图片到此处(可多选)</p>
    <p class="tip">每张图片一页,页面尺寸与图片一致,按列表顺序合并</p>
  </div>

  <div v-if="error" class="error-box" style="margin-top: 12px">✗ {{ error }}</div>

  <div v-if="items.length" class="panel" style="margin-top: 14px">
    <label class="field-label">图片列表({{ items.length }})</label>
    <div v-for="(it, i) in items" :key="i" class="img-row">
      <img :src="it.url" class="thumb" alt="" />
      <span class="img-meta">{{ it.w }} × {{ it.h }} px</span>
      <button class="btn btn-sm" :disabled="i === 0" @click="move(i, -1)">↑</button>
      <button class="btn btn-sm" :disabled="i === items.length - 1" @click="move(i, 1)">↓</button>
      <button class="btn btn-sm" @click="remove(i)">✕</button>
    </div>
  </div>

  <div v-if="items.length" class="row" style="margin-top: 14px">
    <button class="btn btn-primary" :disabled="busy" @click="convert">
      {{ busy ? '转换中…' : `🖨️ 转换为 PDF(${items.length} 张图)` }}
    </button>
    <button class="btn" @click="clearAll">清空</button>
  </div>
</template>

<style scoped>
.dropzone {
  border: 2px dashed var(--border);
  border-radius: var(--radius);
  padding: 44px 20px;
  text-align: center;
  cursor: pointer;
  color: var(--muted);
  transition: border-color 0.15s, background 0.15s;
}
.dropzone:hover {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.dz-icon {
  font-size: 40px;
  margin-bottom: 6px;
}
.dropzone p { margin: 4px 0; }
.img-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 0;
  border-bottom: 1px dashed var(--border);
}
.img-row:last-child {
  border-bottom: none;
}
.thumb {
  width: 54px;
  height: 40px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid var(--border);
}
.img-meta {
  flex: 1;
  font-size: 14px;
  color: var(--muted);
}
</style>
