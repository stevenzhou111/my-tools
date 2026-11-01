<script setup>
import AppIcon from '@/components/AppIcon.vue'
import { ref } from 'vue'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { downloadBlob } from '@/utils/image'
import { rotatedSize, uprightAnchor } from '@/utils/pdfRotate'

const fileInput = ref(null)
const file = ref(null)
const docRef = ref(null)
const pageCount = ref(0)
const position = ref('center')
const fontSize = ref(12)
const startFrom = ref(1)
const showTotal = ref(true)
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
  busy.value = true
  try {
    const doc = await PDFDocument.load(await docRef.value.save(), { ignoreEncryption: true })
    const font = await doc.embedFont(StandardFonts.Helvetica)
    const pages = doc.getPages()
    // 起始页码强制为 ≥1 的整数,避免空串/负数产出错乱页码
    const start = Math.max(1, Math.floor(Number(startFrom.value) || 1))
    const total = start - 1 + pages.length
    pages.forEach((page, idx) => {
      const num = start + idx
      const label = showTotal.value ? `${num} / ${total}` : `${num}`
      // 在"显示坐标系"里定位,再映射回未旋转空间,扫描件的 /Rotate 不会让页码横躺
      const { width } = rotatedSize(page)
      const textWidth = font.widthOfTextAtSize(label, fontSize.value)
      const margin = 28
      const xd = position.value === 'left' ? margin : position.value === 'right' ? width - margin - textWidth : (width - textWidth) / 2
      const anchor = uprightAnchor(page, xd, 18)
      page.drawText(label, {
        x: anchor.x,
        y: anchor.y,
        size: fontSize.value,
        font,
        color: rgb(0.35, 0.35, 0.4),
        rotate: anchor.rotate,
      })
    })
    downloadBlob(new Blob([await doc.save()], { type: 'application/pdf' }), file.value.name.replace(/\.pdf$/i, '') + '-页码.pdf')
  } catch (e) {
    error.value = '添加页码失败:' + e.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="dropzone" @click="pick">
    <input ref="fileInput" type="file" accept="application/pdf" class="sr-only" @change="onFileChange" />
    <div class="dz-icon"><AppIcon name="hash" :size="30" /></div>
    <p v-if="!file"><strong>点击选择 PDF 文件</strong></p>
    <p v-else><strong>{{ file.name }}</strong> · 共 {{ pageCount }} 页</p>
  </div>

  <div v-if="error" class="error-box mt-12">✗ {{ error }}</div>

  <div v-if="docRef" class="panel mt-14">
    <div class="row mb-14">
      <label class="ctrl">
        <span class="field-label">位置</span>
        <select v-model="position" class="select">
          <option value="left">左下角</option>
          <option value="center">底部居中</option>
          <option value="right">右下角</option>
        </select>
      </label>
      <label class="ctrl">
        <span class="field-label">字号 {{ fontSize }}</span>
        <input v-model.number="fontSize" type="range" min="8" max="24" />
      </label>
      <label class="ctrl">
        <span class="field-label">起始页码</span>
        <input v-model.number="startFrom" type="number" min="1" class="input" style="width: 90px" />
      </label>
      <label class="check" style="margin-top: 22px">
        <input v-model="showTotal" type="checkbox" />显示总页数(x / y)
      </label>
    </div>
    <button class="btn btn-primary" :disabled="busy" @click="apply">
      {{ busy ? '处理中…' : '<AppIcon name="hash" :size="15" /> 添加页码并下载' }}
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
