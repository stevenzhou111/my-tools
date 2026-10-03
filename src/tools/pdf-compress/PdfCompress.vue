<script setup>
import { ref } from 'vue'
import { loadPdf } from '@/utils/pdfjs'
import { PDFDocument } from 'pdf-lib'
import { downloadBlob } from '@/utils/image'
import { formatSize } from '@/utils/format'

const fileInput = ref(null)
const dragging = ref(false)
const file = ref(null)
const originalSize = ref(0)
const busy = ref(false)
const progress = ref(0)
const error = ref('')
const resultBlob = ref(null)
const resultSize = ref(0)
const scale = ref(1.5)
const quality = ref(0.7)
const totalTime = ref(0)

function pick() {
  fileInput.value?.click()
}
function onFileChange(e) {
  const f = e.target.files?.[0]
  if (f) process(f)
  e.target.value = ''
}
function onDrop(e) {
  dragging.value = false
  const f = e.dataTransfer?.files?.[0]
  if (f) process(f)
}

async function process(f) {
  error.value = ''
  resultBlob.value = null
  if (!/\.pdf$/i.test(f.name)) return (error.value = '请选择 PDF 文件')
  file.value = f
  originalSize.value = f.size
  busy.value = true
  progress.value = 0
  const started = Date.now()
  try {
    const bytes = await f.arrayBuffer()
    const doc = await loadPdf(bytes.slice(0))
    const out = await PDFDocument.create()
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const viewport = page.getViewport({ scale: scale.value })
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(viewport.width)
      canvas.height = Math.round(viewport.height)
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
      const jpeg = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality.value))
      if (!jpeg) throw new Error(`第 ${i} 页渲染失败(页面可能过大,请降低渲染倍率)`)
      const embedded = await out.embedJpg(await jpeg.arrayBuffer())
      // 页面尺寸与原始视口一致(1:1 pt),内容整页铺满
      const outPage = out.addPage([viewport.width / scale.value, viewport.height / scale.value])
      outPage.drawImage(embedded, { x: 0, y: 0, width: outPage.getWidth(), height: outPage.getHeight() })
      progress.value = Math.round((i / doc.numPages) * 100)
      page.cleanup()
    }
    const saved = await out.save({ useObjectStreams: true })
    resultBlob.value = new Blob([saved], { type: 'application/pdf' })
    resultSize.value = resultBlob.value.size
    totalTime.value = ((Date.now() - started) / 1000).toFixed(1)
  } catch (e) {
    error.value = '压缩失败:' + (e.message || e)
  } finally {
    busy.value = false
  }
}

function download() {
  if (resultBlob.value) downloadBlob(resultBlob.value, file.value.name.replace(/\.pdf$/i, '') + '-压缩.pdf')
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
    <input ref="fileInput" type="file" accept="application/pdf" hidden @change="onFileChange" />
    <div class="dz-icon">🗜️</div>
    <p><strong>点击选择 PDF 文件</strong> 或拖拽到此处</p>
    <p class="tip">通过重采样页面图片的方式压缩体积;⚠️ 文字将变为图片,不可选中/搜索</p>
  </div>

  <div v-if="error" class="error-box" style="margin-top: 12px">✗ {{ error }}</div>

  <div v-if="file" class="row" style="margin-top: 14px">
    <label class="ctrl">
      <span class="field-label">渲染倍率(越小体积越小)</span>
      <select v-model.number="scale" class="select">
        <option :value="1">1x · 最省</option>
        <option :value="1.5">1.5x · 均衡</option>
        <option :value="2">2x · 更清晰</option>
      </select>
    </label>
    <label class="ctrl">
      <span class="field-label">JPEG 质量</span>
      <select v-model.number="quality" class="select">
        <option :value="0.5">50% · 最省</option>
        <option :value="0.7">70% · 推荐</option>
        <option :value="0.85">85% · 高质量</option>
      </select>
    </label>
    <button class="btn btn-primary" style="margin-top: 22px" :disabled="busy" @click="process(file)">
      {{ busy ? `压缩中 ${progress}%` : '🗜️ 开始压缩' }}
    </button>
  </div>

  <div v-if="busy || progress" class="progress-wrap">
    <div class="progress-bar" :style="{ width: progress + '%' }"></div>
  </div>

  <div v-if="resultBlob" class="panel" style="margin-top: 14px">
    <div class="row">
      <strong>压缩完成</strong>
      <span class="tip">耗时 {{ totalTime }} 秒</span>
      <span class="tip">{{ formatSize(originalSize) }} → <strong :style="{ color: resultSize < originalSize ? 'var(--accent)' : 'var(--danger)' }">{{ formatSize(resultSize) }}</strong>({{ resultSize < originalSize ? '省 ' + Math.round((1 - resultSize / originalSize) * 100) + '%' : '未变小,请调低倍率/质量' }})</span>
      <button class="btn btn-primary" @click="download">⬇️ 下载压缩后的 PDF</button>
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
.ctrl {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 200px;
}
.progress-wrap {
  margin-top: 14px;
  height: 8px;
  background: var(--bg-soft);
  border-radius: 6px;
  overflow: hidden;
}
.progress-bar {
  height: 100%;
  background: var(--accent-grad);
  border-radius: 6px;
  transition: width 0.2s;
}
</style>
