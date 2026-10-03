<script setup>
import { computed, ref } from 'vue'
import * as XLSX from 'xlsx'
import { downloadBlob } from '@/utils/image'
import { useCopy } from '@/utils/useCopy'

const tab = ref('toExcel')
const jsonInput = ref(`[
  { "name": "张三", "age": 25, "city": "北京" },
  { "name": "李四", "age": 30, "city": "上海" },
  { "name": "王五", "age": 28, "city": "深圳" }
]`)
const error = ref('')
const jsonResult = ref('')
const { copiedKey, copy } = useCopy()

// JSON → Excel / CSV
function exportFile(type) {
  error.value = ''
  try {
    const data = JSON.parse(jsonInput.value)
    if (!Array.isArray(data) || !data.length) {
      error.value = '请输入非空的 JSON 数组,每个元素是一行(对象键为表头)'
      return
    }
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    if (type === 'xlsx') {
      const bytes = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      downloadBlob(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'data.xlsx')
    } else {
      const csv = '\uFEFF' + XLSX.utils.sheet_to_csv(ws)
      downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'data.csv')
    }
  } catch (e) {
    error.value = 'JSON 解析失败:' + e.message
  }
}

// Excel → JSON
const fileName = ref('')
const fileInput = ref(null)
const sheetNames = ref([])

function pick() {
  fileInput.value?.click()
}

function onFileChange(e) {
  const f = e.target.files?.[0]
  if (!f) return
  fileName.value = f.name
  const isCsv = /\.(csv|txt)$/i.test(f.name)
  const reader = new FileReader()
  reader.onload = () => {
    try {
      let wb
      if (isCsv) {
        let text
        try {
          text = new TextDecoder('utf-8', { fatal: true }).decode(reader.result)
        } catch {
          text = new TextDecoder('gbk').decode(reader.result)
        }
        if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
        wb = XLSX.read(text, { type: 'string' })
      } else {
        wb = XLSX.read(reader.result, { type: 'array' })
      }
      sheetNames.value = wb.SheetNames
      const all = {}
      for (const name of wb.SheetNames) {
        all[name] = XLSX.utils.sheet_to_json(wb.Sheets[name])
      }
      jsonResult.value = JSON.stringify(wb.SheetNames.length === 1 ? all[wb.SheetNames[0]] : all, null, 2)
      error.value = ''
    } catch (err) {
      error.value = '读取文件失败:' + err.message
    }
  }
  reader.onerror = () => {
    error.value = '读取文件失败,请重试'
  }
  reader.readAsArrayBuffer(f)
}

const canExport = computed(() => {
  try {
    const d = JSON.parse(jsonInput.value)
    return Array.isArray(d) && d.length > 0
  } catch {
    return false
  }
})
</script>

<template>
  <div class="row" style="margin-bottom: 16px">
    <button class="btn" :class="{ 'btn-primary': tab === 'toExcel' }" @click="tab = 'toExcel'">JSON → Excel / CSV</button>
    <button class="btn" :class="{ 'btn-primary': tab === 'toJson' }" @click="tab = 'toJson'">Excel → JSON</button>
  </div>

  <div v-if="error" class="error-box" style="margin-bottom: 12px">✗ {{ error }}</div>

  <template v-if="tab === 'toExcel'">
    <div class="field">
      <label class="field-label">JSON 数组(对象数组,每个元素一行)</label>
      <textarea v-model="jsonInput" class="textarea" rows="8" spellcheck="false"></textarea>
    </div>
    <div class="row">
      <button class="btn btn-primary" :disabled="!canExport" @click="exportFile('xlsx')">⬇️ 下载 Excel (.xlsx)</button>
      <button class="btn" :disabled="!canExport" @click="exportFile('csv')">⬇️ 下载 CSV(带 BOM,Excel 直接打开不乱码)</button>
    </div>
  </template>

  <template v-else>
    <div class="dropzone" @click="pick">
      <input ref="fileInput" type="file" accept=".xlsx,.xls,.csv" hidden @change="onFileChange" />
      <div class="dz-icon">📗</div>
      <p><strong>点击选择 Excel / CSV 文件</strong>,转换为 JSON</p>
      <p v-if="fileName" class="tip">已读取:{{ fileName }}<template v-if="sheetNames.length"> · 工作表:{{ sheetNames.join('、') }}</template></p>
    </div>

    <template v-if="jsonResult">
      <pre class="output" style="margin-top: 14px">{{ jsonResult }}</pre>
      <div class="row" style="margin-top: 10px">
        <button class="btn btn-sm" @click="copy('json', jsonResult)">
          {{ copiedKey === 'json' ? '✓ 已复制' : '复制 JSON' }}
        </button>
      </div>
    </template>
  </template>
</template>

<style scoped>
.dropzone {
  border: 2px dashed var(--border);
  border-radius: var(--radius);
  padding: 40px 20px;
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
</style>
