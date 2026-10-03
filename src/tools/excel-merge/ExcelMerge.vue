<script setup>
import { ref } from 'vue'
import * as XLSX from 'xlsx'
import { zipSync } from 'fflate'
import { downloadBlob } from '@/utils/image'

const tab = ref('merge')
const mergeInput = ref(null)
const splitInput = ref(null)
const files = ref([])
const busy = ref(false)
const error = ref('')
const info = ref('')

function pickMerge() {
  mergeInput.value?.click()
}
function onMergeChange(e) {
  for (const f of e.target.files || []) files.value.push(f)
  e.target.value = ''
}
function pickSplit() {
  splitInput.value?.click()
}

async function onSplitChange(e) {
  const f = e.target.files?.[0]
  e.target.value = ''
  if (f) await split(f)
}

// 统一按 UTF-8/GBK 处理 CSV,其余按二进制工作簿读取
function readWorkbook(f) {
  return new Promise((resolve, reject) => {
    const isText = /\.(csv|txt)$/i.test(f.name)
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
          resolve({ wb: XLSX.read(text, { type: 'string' }), name: f.name })
        } else {
          resolve({ wb: XLSX.read(reader.result, { type: 'array' }), name: f.name })
        }
      } catch (err) {
        reject(new Error(`「${f.name}」解析失败:${err.message}`))
      }
    }
    reader.onerror = () => reject(new Error(`「${f.name}」读取失败`))
    reader.readAsArrayBuffer(f)
  })
}

async function merge() {
  error.value = ''
  info.value = ''
  if (files.value.length < 2) return (error.value = '请至少选择两个文件')
  busy.value = true
  try {
    const out = XLSX.utils.book_new()
    const used = new Set()
    let sheetCount = 0
    for (const f of files.value) {
      const { wb } = await readWorkbook(f)
      for (const name of wb.SheetNames) {
        let unique = name.replace(/[\\/?*[\]:]/g, '_').slice(0, 28) || 'Sheet'
        let n = 2
        while (used.has(unique)) unique = `${name.slice(0, 24)}(${n++})`
        used.add(unique)
        XLSX.utils.book_append_sheet(out, wb.Sheets[name], unique)
        sheetCount++
      }
    }
    const bytes = XLSX.write(out, { bookType: 'xlsx', type: 'array' })
    downloadBlob(
      new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      'merged.xlsx',
    )
    info.value = `已合并 ${files.value.length} 个文件,共 ${sheetCount} 个工作表`
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}

async function split(f) {
  error.value = ''
  info.value = ''
  busy.value = true
  try {
    const { wb, name } = await readWorkbook(f)
    if (wb.SheetNames.length < 2) return (error.value = '该文件只有一个工作表,无需拆分')
    const zipEntries = {}
    for (const sheet of wb.SheetNames) {
      const single = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(single, wb.Sheets[sheet], sheet.slice(0, 31))
      zipEntries[`${sheet.replace(/[\\/:*?"<>|]/g, '_')}.xlsx`] = XLSX.write(single, {
        bookType: 'xlsx',
        type: 'array',
      })
    }
    downloadBlob(new Blob([zipSync(zipEntries)], { type: 'application/zip' }), `${name.replace(/\.(xlsx|xls|csv)$/i, '')}-拆分.zip`)
    info.value = `已拆分为 ${wb.SheetNames.length} 个 Excel 文件(ZIP):${wb.SheetNames.join('、')}`
  } catch (e) {
    error.value = e.message || '拆分失败'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="row" style="margin-bottom: 16px">
    <button class="btn" :class="{ 'btn-primary': tab === 'merge' }" @click="tab = 'merge'">📗 合并多个 Excel</button>
    <button class="btn" :class="{ 'btn-primary': tab === 'split' }" @click="tab = 'split'">📂 拆分多 Sheet 为多文件</button>
  </div>

  <div v-if="error" class="error-box" style="margin-bottom: 12px">✗ {{ error }}</div>
  <p v-if="info" class="tip" style="margin-bottom: 12px">✅ {{ info }}</p>

  <template v-if="tab === 'merge'">
    <div class="dropzone" @click="pickMerge">
      <input ref="mergeInput" type="file" accept=".xlsx,.xls,.csv" multiple hidden @change="onMergeChange" />
      <div class="dz-icon">📚</div>
      <p><strong>点击选择多个 Excel / CSV 文件</strong></p>
      <p class="tip">所有工作表按顺序合并为一个 xlsx,同名工作表自动加序号</p>
    </div>
    <div v-if="files.length" class="panel" style="margin-top: 14px">
      <div v-for="(f, i) in files" :key="i" class="file-row">
        <span class="file-name">{{ f.name }}</span>
        <button class="btn btn-sm" @click="files.splice(i, 1)">✕</button>
      </div>
    </div>
    <div v-if="files.length" class="row" style="margin-top: 14px">
      <button class="btn btn-primary" :disabled="busy" @click="merge">{{ busy ? '合并中…' : `📚 合并 ${files.length} 个文件` }}</button>
      <button class="btn" @click="files = []">清空</button>
    </div>
  </template>

  <template v-else>
    <div class="dropzone" @click="pickSplit">
      <input ref="splitInput" type="file" accept=".xlsx,.xls" hidden @change="onSplitChange" />
      <div class="dz-icon">📂</div>
      <p><strong>点击选择一个多 Sheet 的 Excel 文件</strong></p>
      <p class="tip">每个工作表导出为独立的 xlsx,打包成 ZIP 下载</p>
    </div>
    <div class="row" style="margin-top: 14px">
      <button class="btn btn-primary" :disabled="busy" @click="split">{{ busy ? '处理中…' : '📂 选择文件并拆分' }}</button>
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
.dropzone:hover {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.dz-icon {
  font-size: 40px;
  margin-bottom: 6px;
}
.dropzone p { margin: 4px 0; }
.file-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 6px 0;
  border-bottom: 1px dashed var(--border);
  font-size: 14px;
}
.file-row:last-child { border-bottom: none; }
.file-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
