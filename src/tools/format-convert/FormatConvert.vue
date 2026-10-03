<script setup>
import { ref } from 'vue'
import * as XLSX from 'xlsx'
import { downloadBlob } from '@/utils/image'

const fileInput = ref(null)
const dragging = ref(false)
const file = ref(null)
const sheetNames = ref([])
const target = ref('xlsx')
const busy = ref(false)
const error = ref('')
const info = ref('')

const TARGETS = [
  { id: 'xlsx', name: 'XLSX(现代 Excel)', ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  { id: 'xls', name: 'XLS(Excel 97-2003)', ext: 'xls', mime: 'application/vnd.ms-excel' },
  { id: 'ods', name: 'ODS(OpenDocument 表格)', ext: 'ods', mime: 'application/vnd.oasis.opendocument.spreadsheet' },
  { id: 'csv', name: 'CSV(仅第一个工作表)', ext: 'csv', mime: 'text/csv;charset=utf-8' },
  { id: 'html', name: 'HTML 网页表格', ext: 'html', mime: 'text/html;charset=utf-8' },
]

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
  if (!/\.(xlsx|xls|ods|csv)$/i.test(f.name)) return (error.value = '支持 .xlsx / .xls / .ods / .csv 输入')
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

async function convert() {
  error.value = ''
  info.value = ''
  const t = TARGETS.find((x) => x.id === target.value)
  busy.value = true
  try {
    const wb = await readWorkbook(file.value)
    if (target.value === 'csv' && wb.SheetNames.length > 1) {
      info.value = `原文件有 ${wb.SheetNames.length} 个工作表,CSV 仅导出第一个「${wb.SheetNames[0]}」`
    }
    const data = XLSX.write(wb, { bookType: t.id, type: 'array' })
    const blob = target.value === 'csv'
      ? new Blob(['\uFEFF' + new TextDecoder().decode(data)], { type: t.mime })
      : new Blob([data], { type: t.mime })
    downloadBlob(blob, `${file.value.name.replace(/\.[^.]+$/, '')}.${t.ext}`)
    info.value = `已转换为 ${t.name}`
  } catch (e) {
    error.value = '转换失败:' + e.message
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
    <input ref="fileInput" type="file" accept=".xlsx,.xls,.ods,.csv" hidden @change="onFileChange" />
    <div class="dz-icon">🔁</div>
    <p><strong>点击选择表格文件</strong>(.xlsx / .xls / .ods / .csv)或拖拽到此处</p>
    <p class="tip">在 XLSX、XLS、ODS、CSV、HTML 之间互转,多工作表完整保留</p>
  </div>

  <div v-if="error" class="error-box" style="margin-top: 12px">✗ {{ error }}</div>
  <p v-if="info" class="tip" style="margin-top: 10px">✅ {{ info }}</p>

  <template v-if="file">
    <p class="tip" style="margin: 12px 0">
      {{ file.name }} · 工作表:{{ sheetNames.join('、') }}
    </p>
    <div class="row">
      <label class="ctrl">
        <span class="field-label">转换为</span>
        <select v-model="target" class="select">
          <option v-for="t in TARGETS" :key="t.id" :value="t.id">{{ t.name }}</option>
        </select>
      </label>
      <button class="btn btn-primary" style="margin-top: 22px" :disabled="busy" @click="convert">
        {{ busy ? '转换中…' : '🔁 转换并下载' }}
      </button>
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
.ctrl {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 240px;
}
</style>
