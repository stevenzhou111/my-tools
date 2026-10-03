<script setup>
import { ref } from 'vue'
import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib'
import { downloadBlob } from '@/utils/image'

const fileInput = ref(null)
const file = ref(null)
const docRef = ref(null)
const pageCount = ref(0)
const text = ref('CONFIDENTIAL')
const fontSize = ref(48)
const opacity = ref(0.15)
const angle = ref(45)
const busy = ref(false)
const error = ref('')

function pick() {
  fileInput.value?.click()
}
async function onFileChange(e) {
  const f = e.target.files?.[0]
  if (!f) return
  error.value = ''
  try {
    const doc = await PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: true })
    if (doc.isEncrypted) return (error.value = '该 PDF 已加密,请先解密后再操作')
    docRef.value = doc
    file.value = f
    pageCount.value = doc.getPageCount()
  } catch (err) {
    error.value = '读取 PDF 失败:' + err.message
  }
}

async function apply() {
  error.value = ''
  if (!docRef.value) return (error.value = '请先选择 PDF 文件')
  if (/^[^\x00-\xff]*$/.test(text.value) || /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(text.value)) {
    return (error.value = 'PDF 标准字体不支持中文与全角字符,请使用英文、数字或符号作为水印')
  }
  busy.value = true
  try {
    const doc = await PDFDocument.load(await docRef.value.save(), { ignoreEncryption: true })
    const font = await doc.embedFont(StandardFonts.HelveticaBold)
    const color = rgb(0.55, 0.55, 0.6)
    for (const page of doc.getPages()) {
      const { width, height } = page.getSize()
      const textWidth = font.widthOfTextAtSize(text.value, fontSize.value)
      page.drawText(text.value, {
        x: Math.max(0, (width - textWidth) / 2),
        y: height / 2 - fontSize.value / 2,
        size: fontSize.value,
        font,
        color,
        opacity: opacity.value,
        rotate: degrees(angle.value),
      })
    }
    downloadBlob(new Blob([await doc.save()], { type: 'application/pdf' }), file.value.name.replace(/\.pdf$/i, '') + '-水印.pdf')
  } catch (e) {
    error.value = '添加水印失败:' + e.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="dropzone" @click="pick">
    <input ref="fileInput" type="file" accept="application/pdf" hidden @change="onFileChange" />
    <div class="dz-icon">💧</div>
    <p v-if="!file"><strong>点击选择 PDF 文件</strong></p>
    <p v-else><strong>{{ file.name }}</strong> · 共 {{ pageCount }} 页</p>
  </div>

  <div v-if="error" class="error-box" style="margin-top: 12px">✗ {{ error }}</div>

  <div v-if="docRef" class="panel" style="margin-top: 14px">
    <div class="row" style="margin-bottom: 14px">
      <label class="ctrl" style="flex: 1">
        <span class="field-label">水印文字(建议英文)</span>
        <input v-model="text" class="input" spellcheck="false" />
      </label>
      <label class="ctrl">
        <span class="field-label">字号 {{ fontSize }}</span>
        <input v-model.number="fontSize" type="range" min="16" max="120" />
      </label>
      <label class="ctrl">
        <span class="field-label">透明度 {{ Math.round(opacity * 100) }}%</span>
        <input v-model.number="opacity" type="range" min="0.05" max="0.6" step="0.05" />
      </label>
      <label class="ctrl">
        <span class="field-label">旋转角度 {{ angle }}°</span>
        <input v-model.number="angle" type="range" min="0" max="90" step="15" />
      </label>
    </div>
    <button class="btn btn-primary" :disabled="busy" @click="apply">
      {{ busy ? '处理中…' : '💧 添加水印并下载' }}
    </button>
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
.ctrl {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 150px;
}
</style>
