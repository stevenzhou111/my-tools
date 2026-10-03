<script setup>
import { ref } from 'vue'
import * as XLSX from 'xlsx'
import { PDFDocument } from 'pdf-lib'
import { zipSync } from 'fflate'
import { downloadBlob } from '@/utils/image'

const fileInput = ref(null)
const dragging = ref(false)
const file = ref(null)
const sheetNames = ref([])
const busy = ref(false)
const error = ref('')
const info = ref('')

function pick() {
  fileInput.value?.click()
}
function onFileChange(e) {
  const f = e.target.files?.[0]
  if (f) load(f)
  e.target.value = ''
}
function onDrop(e) {
  dragging.value = false
  const f = e.dataTransfer?.files?.[0]
  if (f) load(f)
}

async function load(f) {
  error.value = ''
  info.value = ''
  sheetNames.value = []
  if (!/\.(xlsx|xls|csv)$/i.test(f.name)) return (error.value = '请选择 Excel(.xlsx / .xls)或 CSV 文件')
  busy.value = true
  try {
    const wb = await readWorkbook(f)
    file.value = f
    sheetNames.value = wb.SheetNames
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}

function readWorkbook(f) {
  return new Promise((resolve, reject) => {
    const isText = /\.csv$/i.test(f.name)
    const reader = new FileReader()
    reader.onload = () => {
      try {
        if (isText) {
          let text
          try {
            text = new TextDecoder('utf-8', { fatal: true }).decode(reader.result)
          } catch {
            text = new TextDecoder('gbk').decode(reader.result)
          }
          if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
          resolve(XLSX.read(text, { type: 'string' }))
        } else {
          resolve(XLSX.read(reader.result, { type: 'array' }))
        }
      } catch (err) {
        reject(new Error('解析失败:' + err.message))
      }
    }
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsArrayBuffer(f)
  })
}

const tableTruncated = ref(false)

/** 把二维表格数据绘制为一张表格长图 */
function renderTable(rows) {
  const FS = 14
  const PAD = 10
  const ROW_H = 30
  const measure = document.createElement('canvas').getContext('2d')
  measure.font = `${FS}px system-ui`
  const colCount = Math.max(...rows.map((r) => r.length))
  const widths = []
  for (let c = 0; c < colCount; c++) {
    let w = 60
    for (const r of rows) {
      const cell = r[c] == null ? '' : String(r[c])
      w = Math.max(w, measure.measureText(cell).width + PAD * 2)
    }
    widths.push(Math.min(w, 360))
  }
  const totalW = widths.reduce((a, b) => a + b, 0) + 2
  const totalH = rows.length * ROW_H + 2
  // 超出浏览器画布上限的内容会被静默截断,先记下来提醒用户
  tableTruncated.value = totalW > 12000 || totalH > 12000
  const width = Math.min(totalW, 12000)
  const height = Math.min(totalH, 12000)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.font = `${FS}px system-ui`
  let x = 0
  const xs = []
  for (const w of widths) {
    xs.push(x)
    x += w
  }
  rows.forEach((row, ri) => {
    const y = ri * ROW_H
    // 表头底色与斑马纹
    ctx.fillStyle = ri === 0 ? '#eef0fb' : ri % 2 ? '#f7f8fc' : '#ffffff'
    ctx.fillRect(0, y, width, ROW_H)
    ctx.strokeStyle = '#d8dcea'
    ctx.strokeRect(0.5, y + 0.5, width - 1, ROW_H)
    row.forEach((cell, ci) => {
      const text = cell == null ? '' : String(cell)
      ctx.fillStyle = ri === 0 ? '#3a3f5c' : '#24292f'
      if (ri === 0) ctx.font = `600 ${FS}px system-ui`
      ctx.fillText(text, xs[ci] + PAD, y + ROW_H / 2 + FS / 2 - 2, widths[ci] - PAD * 2)
      if (ri === 0) ctx.font = `${FS}px system-ui`
      ctx.strokeStyle = '#d8dcea'
      ctx.strokeRect(xs[ci] + 0.5, y + 0.5, widths[ci] - 1, ROW_H)
    })
  })
  return canvas
}

async function exportPng() {
  error.value = ''
  info.value = ''
  busy.value = true
  try {
    const wb = await readWorkbook(file.value)
    const entries = {}
    for (const name of wb.SheetNames) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '' })
      if (!rows.length) continue
      const { canvas } = renderTable(rows)
      const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'))
      if (wb.SheetNames.length === 1) {
        downloadBlob(blob, file.value.name.replace(/\.[^.]+$/, '') + '.png')
        info.value = '已导出 1 张图片'
        busy.value = false
        return
      }
      entries[`${name.replace(/[\\/:*?"<>|]/g, '_')}.png`] = new Uint8Array(await blob.arrayBuffer())
    }
    if (!Object.keys(entries).length) return (error.value = '所有工作表都是空的')
    downloadBlob(new Blob([zipSync(entries)], { type: 'application/zip' }), file.value.name.replace(/\.[^.]+$/, '') + '-图片.zip')
    info.value = `已导出 ${Object.keys(entries).length} 张图片(ZIP),每个工作表一张`
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}

async function exportPdf() {
  error.value = ''
  info.value = ''
  busy.value = true
  try {
    const wb = await readWorkbook(file.value)
    const out = await PDFDocument.create()
    const pageW = 595
    const pageH = 842
    const margin = 28
    const drawW = pageW - margin * 2
    for (const name of wb.SheetNames) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '' })
      if (!rows.length) continue
      const canvas = renderTable(rows)
      // A4 纵向:长表格按内容高度切片,每片一页(pdf-lib 不支持裁剪图片)
      const slicePx = Math.floor(((pageH - margin * 2) / drawW) * canvas.width)
      const slices = Math.max(1, Math.ceil(canvas.height / slicePx))
      for (let s = 0; s < slices; s++) {
        const sy = s * slicePx
        const sh = Math.min(slicePx, canvas.height - sy)
        const sliceCanvas = document.createElement('canvas')
        sliceCanvas.width = canvas.width
        sliceCanvas.height = sh
        sliceCanvas.getContext('2d').drawImage(canvas, 0, sy, canvas.width, sh, 0, 0, canvas.width, sh)
        const png = await new Promise((res) => sliceCanvas.toBlob(res, 'image/png'))
        const embedded = await out.embedPng(await png.arrayBuffer())
        const page = out.addPage([pageW, pageH])
        const drawH = (sh / canvas.width) * drawW
        page.drawImage(embedded, { x: margin, y: pageH - margin - drawH, width: drawW, height: drawH })
      }
    }
    downloadBlob(new Blob([await out.save()], { type: 'application/pdf' }), file.value.name.replace(/\.[^.]+$/, '') + '.pdf')
    info.value = '已导出 PDF(A4 纵向,长表自动分页)'
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
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
    <input ref="fileInput" type="file" accept=".xlsx,.xls,.csv" hidden @change="onFileChange" />
    <div class="dz-icon">📊</div>
    <p><strong>点击选择 Excel / CSV 文件</strong> 或拖拽到此处</p>
    <p class="tip">把表格渲染成图片或 PDF(本地绘制,支持多工作表)</p>
  </div>

  <div v-if="error" class="error-box" style="margin-top: 12px">✗ {{ error }}</div>
  <p v-if="tableTruncated" class="tip" style="margin-top: 10px">⚠️ 表格超出画布上限(12000px),超出部分的行/列已被截断,建议精简数据后重试。</p>
  <p v-if="info" class="tip" style="margin-top: 10px">✅ {{ info }}</p>

  <template v-if="file">
    <p class="tip" style="margin: 12px 0">工作表:{{ sheetNames.join('、') }}</p>
    <div class="row">
      <button class="btn btn-primary" :disabled="busy" @click="exportPng">🖼️ 转为图片(PNG)</button>
      <button class="btn btn-primary" :disabled="busy" @click="exportPdf">📄 转为 PDF(A4 分页)</button>
    </div>
  </template>
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
</style>
