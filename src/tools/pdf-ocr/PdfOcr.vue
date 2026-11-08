<script setup>
import { computed, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import CopyButton from '@/components/CopyButton.vue'
import OnlineBanner from '@/components/OnlineBanner.vue'
import { downloadBlob } from '@/utils/image'
import { loadPdf } from '@/utils/pdfjs'
import { OCR_LANGS } from '@/utils/ocrLangs'

/**
 * 扫描版 PDF 文字识别:pdf.js 本机逐页渲染成位图,再交给 Tesseract.js 识别
 * (与「图片文字识别」同一套本机 WASM 推理与模型缓存,语言表共用 utils/ocrLangs)。
 * PDF 与图片全程不上传;模型首次联网下载后离线可用。
 */

const MAX_PAGES = 50 // 防止超大 PDF 把免费会话拖死;扫描书稿建议先拆分

const fileInput = ref(null)
const dragging = ref(false)
const error = ref('')
const result = ref('')
const sourceInfo = ref('')
const busy = ref(false)
const pageProgress = ref('') // 第 x / y 页
const ocrProgress = ref(0)
const progressText = ref('')
const selected = ref(['chi_sim', 'eng'])
const pageCount = ref(0)
const pdfBytes = ref(null) // 保留原始字节,重复识别复用

const fileMeta = ref('')
const fileInputName = ref('')

const STATUS_TEXT = {
  'loading tesseract core': '加载识别引擎…',
  'initializing tesseract': '初始化引擎…',
  'loading language traineddata': '下载语言模型(首次较慢,之后走缓存)…',
  'initializing api': '准备识别…',
  'recognizing text': '识别中…',
}

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
  result.value = ''
  pageCount.value = 0
  sourceInfo.value = ''
  if (!/\.pdf$/i.test(file.name) || (file.type && file.type !== 'application/pdf')) {
    return (error.value = '请选择 PDF 文件')
  }
  try {
    const bytes = new Uint8Array(await file.arrayBuffer())
    // pdf.js 会 transfer 输入 buffer,复制一份保留用于重复识别
    pdfBytes.value = bytes.slice(0)
    const doc = await loadPdf(bytes.slice(0))
    pageCount.value = doc.numPages
    fileMeta.value = `${doc.numPages} 页`
    fileInputName.value = file.name
    sourceInfo.value = file.name
  } catch (e) {
    error.value = '读取 PDF 失败:' + e.message
  }
}

function toggleLang(id) {
  const i = selected.value.indexOf(id)
  if (i >= 0) {
    if (selected.value.length > 1) selected.value.splice(i, 1)
  } else {
    selected.value.push(id)
  }
}

async function recognize() {
  if (!pdfBytes.value || busy.value || !selected.value.length) return
  error.value = ''
  result.value = ''
  busy.value = true
  ocrProgress.value = 0
  progressText.value = '加载识别引擎…'
  let worker = null
  try {
    const { createWorker } = await import('tesseract.js')
    worker = await createWorker(selected.value.slice().sort().join('+'), 1, {
      logger: (m) => {
        progressText.value = STATUS_TEXT[m.status] || m.status
        if (typeof m.progress === 'number') ocrProgress.value = m.progress
      },
    })
    const doc = await loadPdf(pdfBytes.value.slice(0))
    const parts = []
    const pages = Math.min(doc.numPages, MAX_PAGES)
    for (let p = 1; p <= pages; p++) {
      pageProgress.value = `第 ${p} / ${pages} 页`
      const page = await doc.getPage(p)
      // 渲染倍率 2:扫描件常用低分辨率,放大后识别率明显更好
      const viewport = page.getViewport({ scale: 2 })
      const canvas = document.createElement('canvas')
      canvas.width = Math.floor(viewport.width)
      canvas.height = Math.floor(viewport.height)
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
      const { data } = await worker.recognize(canvas)
      const text = (data.text || '').replace(/\n{3,}/g, '\n\n').trim()
      parts.push(text ? `【第 ${p} 页】\n${text}` : `【第 ${p} 页】(未识别出文字)`)
    }
    if (doc.numPages > MAX_PAGES) {
      parts.push(`⚠ 共 ${doc.numPages} 页,仅识别前 ${MAX_PAGES} 页(上限 ${MAX_PAGES} 页,建议先拆分 PDF)`)
    }
    result.value = parts.join('\n\n')
  } catch (e) {
    error.value = `识别失败:${e.message}(若为模型下载失败,请检查网络后重试)`
  } finally {
    await worker?.terminate().catch(() => {})
    worker = null
    busy.value = false
    pageProgress.value = ''
  }
}

function downloadTxt() {
  downloadBlob(new Blob([result.value], { type: 'text/plain;charset=utf-8' }), 'pdf-ocr.txt')
}

const percent = computed(() => Math.round(ocrProgress.value * 100))
</script>

<template>
  <OnlineBanner class="mb-16">
    首次使用需联网下载所选语言的识别模型(每个约 2~20 MB,之后浏览器缓存可离线);PDF 在本机逐页渲染并识别,不会上传。
  </OnlineBanner>

  <div class="panel mb-16">
    <label class="field-label">识别语言(可多选)</label>
    <div class="lang-row">
      <button
        v-for="l in OCR_LANGS"
        :key="l.id"
        type="button"
        class="lang-chip"
        :class="{ active: selected.includes(l.id) }"
        :aria-pressed="selected.includes(l.id)"
        @click="toggleLang(l.id)"
      >
        {{ l.label }}
      </button>
    </div>

    <div
      class="dropzone mt-14"
      :class="{ dragging }"
      tabindex="0"
      @click="pick"
      @keydown.enter.prevent="pick"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop"
    >
      <input ref="fileInput" type="file" accept="application/pdf,.pdf" class="sr-only" @change="onFileChange" />
      <div class="dz-icon"><AppIcon name="file-scan" :size="30" /></div>
      <p><strong>点击选择 PDF</strong>,拖拽到此处</p>
      <p class="tip">适合扫描件 / 图片型 PDF(文字可复制的 PDF 请用「PDF 提取文本」,更快更准)</p>
    </div>
    <p v-if="fileMeta" class="tip m-0 mt-8">{{ sourceInfo }} · {{ fileMeta }}{{ pageCount > MAX_PAGES ? `(仅识别前 ${MAX_PAGES} 页)` : '' }}</p>

    <div class="row mt-14">
      <button class="btn btn-primary" :disabled="!pdfBytes || busy" @click="recognize">
        <AppIcon name="scan-text" :size="15" />{{ busy ? '识别中…' : '开始识别' }}
      </button>
      <span v-if="busy" class="progress-wrap">
        <span class="tip">{{ pageProgress }} {{ progressText }} {{ percent }}%</span>
        <span class="progress-bar"><span class="progress-fill" :style="{ width: percent + '%' }"></span></span>
      </span>
    </div>
  </div>

  <div v-if="error" class="error-box mb-14">✗ {{ error }}</div>

  <div v-if="result" class="panel">
    <label class="field-label">识别结果 <span class="tip">来自 {{ fileInputName }}</span></label>
    <textarea class="textarea" rows="12" readonly :value="result"></textarea>
    <div class="row mt-10">
      <CopyButton class="btn btn-sm" :text="result" />
      <button class="btn btn-sm" @click="downloadTxt"><AppIcon name="download" :size="14" />下载 .txt</button>
    </div>
  </div>
</template>

<style scoped>
.lang-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.lang-chip {
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 5px 14px;
  font-size: 13.5px;
  background: transparent;
  color: var(--text);
  cursor: pointer;
}
.lang-chip.active {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
}
.dropzone {
  border: 2px dashed var(--border);
  border-radius: var(--radius);
  padding: 36px 20px;
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
.progress-wrap {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}
.progress-bar {
  flex: 1;
  max-width: 220px;
  height: 6px;
  border-radius: 3px;
  background: var(--border);
  overflow: hidden;
}
.progress-fill {
  display: block;
  height: 100%;
  background: var(--accent);
  transition: width 0.2s;
}
</style>
