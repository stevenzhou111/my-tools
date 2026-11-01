<script setup>
import AppIcon from '@/components/AppIcon.vue'
import { onUnmounted, ref } from 'vue'
import { loadPdf } from '@/utils/pdfjs'
import { Zip, ZipDeflate } from 'fflate'
import { downloadBlob } from '@/utils/image'

const fileInput = ref(null)
const dragging = ref(false)
const file = ref(null)
const busy = ref(false)
const progress = ref(0)
const error = ref('')
const scale = ref(2)
const format = ref('image/png')
const previews = ref([]) // { url, page }
const done = ref(false)
const zipBlob = ref(null)
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
  previews.value.forEach((p) => URL.revokeObjectURL(p.url))
  previews.value = []
  done.value = false
  zipBlob.value = null
  if (!/\.pdf$/i.test(f.name)) return (error.value = '请选择 PDF 文件')
  file.value = f
  busy.value = true
  progress.value = 0
  const started = Date.now()
  let doc = null
  try {
    const bytes = await f.arrayBuffer()
    doc = await loadPdf(bytes.slice(0))
    // 流式打包:每页压缩完立即喂给 ZIP,原始页图片字节不再整包驻留内存
    // (几百页的扫描件用 zipSync 需要同时持有全部页图 + 整包副本,峰值内存数倍于流式)
    const chunks = []
    const zip = new Zip((err, dat, final) => {
      if (err) throw err
      if (dat) chunks.push(dat)
      if (final) {
        zipBlob.value = new Blob(chunks, { type: 'application/zip' })
        done.value = true
        totalTime.value = ((Date.now() - started) / 1000).toFixed(1)
      }
    })
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const viewport = page.getViewport({ scale: scale.value })
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(viewport.width)
      canvas.height = Math.round(viewport.height)
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
      const blob = await new Promise((res) => canvas.toBlob(res, format.value, 0.92))
      if (!blob) throw new Error(`第 ${i} 页渲染失败(页面可能过大,请降低清晰度)`)
      if (i <= 6) {
        previews.value.push({ url: URL.createObjectURL(blob), page: i })
      }
      const zf = new ZipDeflate(`page-${String(i).padStart(3, '0')}.${format.value === 'image/png' ? 'png' : 'jpg'}`)
      zip.add(zf)
      zf.push(new Uint8Array(await blob.arrayBuffer()), true)
      progress.value = Math.round((i / doc.numPages) * 100)
      page.cleanup()
    }
    zip.end()
  } catch (e) {
    if (e?.name === 'PasswordException') error.value = 'PDF 已加密,请先解除密码后重试'
    else error.value = '转换失败:' + (e.message || e)
  } finally {
    // pdf.js worker 端会持有已解析文档,不 destroy 反复转换时内存持续累积
    if (doc) await doc.destroy().catch(() => {})
    busy.value = false
  }
}

onUnmounted(() => {
  previews.value.forEach((p) => URL.revokeObjectURL(p.url))
})

function downloadZip() {
  if (zipBlob.value) downloadBlob(zipBlob.value, file.value.name.replace(/\.pdf$/i, '') + '-图片.zip')
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
    <input ref="fileInput" type="file" accept="application/pdf" class="sr-only" @change="onFileChange" />
    <div class="dz-icon"><AppIcon name="image" :size="30" /></div>
    <p><strong>点击选择 PDF 文件</strong> 或拖拽到此处</p>
    <p class="tip">每一页渲染为高清图片,打包成 ZIP 下载;全部在浏览器本地处理</p>
  </div>

  <div v-if="error" class="error-box mt-12">✗ {{ error }}</div>

  <div v-if="file" class="row mt-14">
    <label class="ctrl">
      <span class="field-label">清晰度</span>
      <select v-model.number="scale" class="select">
        <option :value="1">标准(1x)</option>
        <option :value="2">高清(2x)</option>
        <option :value="3">超清(3x,较慢)</option>
      </select>
    </label>
    <label class="ctrl">
      <span class="field-label">图片格式</span>
      <select v-model="format" class="select">
        <option value="image/png">PNG(无损)</option>
        <option value="image/jpeg">JPG(体积小)</option>
      </select>
    </label>
    <button class="btn btn-primary" style="margin-top: 22px" :disabled="busy" @click="process(file)">
      {{ busy ? `转换中 ${progress}%` : '<AppIcon name="image" :size="15" /> 开始转换' }}
    </button>
  </div>

  <div v-if="busy" class="progress-wrap">
    <div class="progress-bar" :style="{ width: progress + '%' }"></div>
  </div>

  <div v-if="done" class="panel mt-14">
    <div class="row mb-12">
      <strong>转换完成</strong>
      <span class="tip">耗时 {{ totalTime }} 秒 · 仅展示前 6 页预览</span>
      <button class="btn btn-primary" @click="downloadZip">⬇️ 下载全部(ZIP)</button>
    </div>
    <div class="preview-grid">
      <img v-for="p in previews" :key="p.page" :src="p.url" :alt="'第 ' + p.page + ' 页'" class="page-thumb" />
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
  min-width: 180px;
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
.preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
}
.page-thumb {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 8px;
}
</style>
