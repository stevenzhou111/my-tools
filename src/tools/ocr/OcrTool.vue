<script setup>
import { computed, onUnmounted, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import CopyButton from '@/components/CopyButton.vue'
import OnlineBanner from '@/components/OnlineBanner.vue'
import { loadImageFromFile, downloadBlob } from '@/utils/image'
import { OCR_LANGS as LANGS } from '@/utils/ocrLangs'

/**
 * 图片文字识别(OCR):Tesseract.js 纯浏览器内推理(WASM)。
 * 图片全程不上传;仅识别模型(按语言,每个数 MB)首次使用时从 CDN 下载,
 * 之后由 tesseract.js 缓存在 IndexedDB,离线可用 —— 因此本工具带「需联网」徽章。
 */

const fileInput = ref(null)
const dragging = ref(false)
const error = ref('')
const result = ref('')
const sourceInfo = ref('')
const busy = ref(false)
const progress = ref(0)
const progressText = ref('')
const selected = ref(['chi_sim', 'eng'])
const image = ref(null) // 缩放后的 canvas,识别与预览用
const previewUrl = ref('')

let worker = null // 进行中的 worker,组件卸载时终止

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
function onPaste(e) {
  const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith('image/'))
  const f = item?.getAsFile()
  if (f) load(f)
}

async function load(file) {
  error.value = ''
  result.value = ''
  sourceInfo.value = ''
  if (!file.type.startsWith('image/')) return (error.value = '请选择图片文件')
  try {
    const img = await loadImageFromFile(file)
    // 超大图先等比缩到 2000px 以内:识别速度随像素数增长,原图常得不偿失
    const scale = Math.min(1, 2000 / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
    image.value = canvas
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = canvas.toDataURL('image/jpeg', 0.8)
    sourceInfo.value = `${file.name}(${img.naturalWidth} × ${img.naturalHeight})`
  } catch (e) {
    error.value = '读取图片失败:' + e.message
  }
}

function toggleLang(id) {
  const i = selected.value.indexOf(id)
  if (i >= 0) {
    if (selected.value.length > 1) selected.value.splice(i, 1) // 至少保留一种语言
  } else {
    selected.value.push(id)
  }
}

async function recognize() {
  if (!image.value || busy.value || !selected.value.length) return
  error.value = ''
  result.value = ''
  busy.value = true
  progress.value = 0
  progressText.value = '加载识别引擎…'
  try {
    const { createWorker } = await import('tesseract.js')
    worker = await createWorker(selected.value.slice().sort().join('+'), 1, {
      logger: (m) => {
        progressText.value = STATUS_TEXT[m.status] || m.status
        if (typeof m.progress === 'number') progress.value = m.progress
      },
    })
    const { data } = await worker.recognize(image.value)
    const text = (data.text || '').replace(/\n{3,}/g, '\n\n').trim()
    if (text) {
      result.value = text
    } else {
      error.value = '未识别出文字。可尝试:提高图片清晰度/对比度、保持文字水平、换更合适的语言组合。'
    }
  } catch (e) {
    error.value = `识别失败:${e.message}(若为模型下载失败,请检查网络后重试)`
  } finally {
    await worker?.terminate().catch(() => {})
    worker = null
    busy.value = false
  }
}

function downloadTxt() {
  downloadBlob(new Blob([result.value], { type: 'text/plain;charset=utf-8' }), 'ocr-result.txt')
}

const progressPercent = computed(() => Math.round(progress.value * 100))

onUnmounted(() => {
  worker?.terminate().catch(() => {})
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})
</script>

<template>
  <OnlineBanner class="mb-16">
    首次使用需联网下载所选语言的识别模型(每个约 2~20 MB,之后浏览器缓存可离线);识别在本机 WASM 中完成,图片不会上传。
  </OnlineBanner>

  <div class="panel mb-16">
    <label class="field-label">识别语言(可多选,含混杂文字时组合识别)</label>
    <div class="lang-row">
      <button
        v-for="l in LANGS"
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
      :class="{ dragging, 'has-img': previewUrl }"
      tabindex="0"
      @click="pick"
      @keydown.enter.prevent="pick"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop"
      @paste="onPaste"
    >
      <input ref="fileInput" type="file" accept="image/*" class="sr-only" @change="onFileChange" />
      <template v-if="previewUrl">
        <img :src="previewUrl" alt="待识别图片预览" class="preview" />
        <p class="tip m-0">{{ sourceInfo }} · 点击或拖入可更换图片</p>
      </template>
      <template v-else>
        <div class="dz-icon"><AppIcon name="scan-text" :size="30" /></div>
        <p><strong>点击选择图片</strong>,拖拽到此处,或直接 Ctrl+V 粘贴截图</p>
        <p class="tip">支持截图、扫描件、照片中的文字</p>
      </template>
    </div>

    <div class="row mt-14">
      <button class="btn btn-primary" :disabled="!image || busy" @click="recognize">
        <AppIcon name="scan-text" :size="15" />{{ busy ? '识别中…' : '开始识别' }}
      </button>
      <span v-if="busy" class="progress-wrap">
        <span class="progress-bar"><span class="progress-fill" :style="{ width: progressPercent + '%' }"></span></span>
        <span class="tip">{{ progressText }} {{ progressPercent }}%</span>
      </span>
    </div>
  </div>

  <div v-if="error" class="error-box mb-14">✗ {{ error }}</div>

  <div v-if="result" class="panel">
    <label class="field-label">识别结果 <span class="tip">来自 {{ sourceInfo }}</span></label>
    <textarea class="textarea" rows="10" readonly :value="result"></textarea>
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
  padding: 28px 20px;
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
.dropzone.has-img {
  padding: 14px;
}
.dz-icon {
  font-size: 40px;
  margin-bottom: 6px;
}
.dropzone p { margin: 4px 0; }
.preview {
  max-width: 100%;
  max-height: 260px;
  border-radius: var(--radius);
  margin-bottom: 8px;
}
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
