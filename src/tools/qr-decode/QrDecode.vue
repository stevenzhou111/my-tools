<script setup>
import { ref } from 'vue'
import jsQR from 'jsqr'
import { loadImageFromFile } from '@/utils/image'
import { useCopy } from '@/utils/useCopy'

const fileInput = ref(null)
const dragging = ref(false)
const error = ref('')
const result = ref('')
const sourceInfo = ref('')
const { copiedKey, copy } = useCopy()

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
    // 超大图先等比缩到 1500px 以内再识别,避免全图扫描长时间卡顿
    const scale = Math.min(1, 1500 / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' })
    if (code && code.data) {
      result.value = code.data
      sourceInfo.value = `${file.name}(${img.naturalWidth} × ${img.naturalHeight})`
    } else {
      error.value = '未能识别出二维码,请确保二维码清晰、完整、对比度足够'
    }
  } catch (e) {
    error.value = '解析失败:' + e.message
  }
}
</script>

<template>
  <div
    class="dropzone"
    :class="{ dragging }"
    tabindex="0"
    @click="pick"
    @dragover.prevent="dragging = true"
    @dragleave.prevent="dragging = false"
    @drop.prevent="onDrop"
    @paste="onPaste"
  >
    <input ref="fileInput" type="file" accept="image/*" hidden @change="onFileChange" />
    <div class="dz-icon">🔍</div>
    <p><strong>点击选择二维码图片</strong>,拖拽到此处,或直接 Ctrl+V 粘贴截图</p>
    <p class="tip">全程本地识别,图片不会上传</p>
  </div>

  <div v-if="error" class="error-box" style="margin-top: 14px">✗ {{ error }}</div>

  <div v-if="result" class="panel" style="margin-top: 14px">
    <label class="field-label">识别结果 <span class="tip">来自 {{ sourceInfo }}</span></label>
    <pre class="output">{{ result }}</pre>
    <div class="row" style="margin-top: 10px">
      <button class="btn btn-sm" @click="copy('out', result)">
        {{ copiedKey === 'out' ? '✓ 已复制' : '复制内容' }}
      </button>
      <a
        v-if="/^https?:\/\//.test(result)"
        :href="result"
        target="_blank"
        rel="noopener noreferrer"
        class="btn btn-sm"
      >
        🔗 打开链接
      </a>
    </div>
  </div>
</template>

<style scoped>
.dropzone {
  border: 2px dashed var(--border);
  border-radius: var(--radius);
  padding: 48px 20px;
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
</style>
