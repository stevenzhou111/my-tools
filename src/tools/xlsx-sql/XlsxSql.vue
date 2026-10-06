<script setup>
import { computed, ref } from 'vue'
import * as XLSX from 'xlsx'
import { buildInserts } from '@/utils/xlsxSql'
import { downloadBlob } from '@/utils/image'
import { useCopy } from '@/utils/useCopy'

const fileInput = ref(null)
const fileName = ref('')
const sheets = ref([])
const activeSheet = ref('')
const parsed = ref(null) // { headers, rows }
const error = ref('')

const table = ref('my_table')
const dialect = ref('mysql')
const mode = ref('batch')
const emptyAsNull = ref(true)

const { copiedKey, copy } = useCopy()

function pick() {
  fileInput.value?.click()
}
function onFileChange(e) {
  const f = e.target.files?.[0]
  if (f) load(f)
}

// 保留最后一次读到的 buffer,切换工作表时重新解析
let lastBuf = null

async function load(file) {
  error.value = ''
  fileName.value = file.name
  try {
    const isCsv = /\.(csv|txt)$/i.test(file.name)
    if (isCsv) {
      // CSV 先按严格 UTF-8 解码,失败回退 GBK(中文 Excel 导出常见),与「Excel 格式转换」同策略
      let text
      try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer())
      } catch {
        text = new TextDecoder('gbk').decode(await file.arrayBuffer())
      }
      if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
      lastBuf = text
      const wb = XLSX.read(text, { type: 'string' })
      sheets.value = wb.SheetNames
      switchSheet(wb.SheetNames[0], wb)
      return
    }
    lastBuf = await file.arrayBuffer()
    const wb = XLSX.read(lastBuf, { cellDates: true })
    sheets.value = wb.SheetNames
    switchSheet(wb.SheetNames[0], wb)
  } catch (e) {
    error.value = '读取失败:' + e.message
  }
}

function switchSheet(name, wb) {
  activeSheet.value = name
  const workbook = wb ?? XLSX.read(lastBuf, typeof lastBuf === 'string' ? { type: 'string' } : { cellDates: true })
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: null, raw: true })
  if (!rows.length) {
    parsed.value = { headers: [], rows: [] }
    return
  }
  parsed.value = { headers: rows[0].map((h, i) => String(h ?? `列${i + 1}`)), rows: rows.slice(1) }
}

const result = computed(() => {
  if (!parsed.value) return { ok: true, text: '' }
  return buildInserts(parsed.value, { dialect: dialect.value, table: table.value, mode: mode.value, emptyAsNull: emptyAsNull.value })
})

function downloadSql() {
  if (!result.value.text) return
  downloadBlob(new Blob([result.value.text], { type: 'text/plain;charset=utf-8' }), `${table.value || 'table'}.sql`)
}
</script>

<template>
  <div
    class="dropzone"
    @click="pick"
  >
    <input ref="fileInput" type="file" accept=".xlsx,.xls,.csv" hidden @change="onFileChange" />
    <div v-if="!fileName">
      <div class="dz-icon">🗄️</div>
      <p><strong>点击选择 Excel / CSV 文件</strong></p>
      <p class="tip">首行为表头,生成 INSERT INTO 语句;全程本地处理</p>
    </div>
    <p v-else class="tip">📄 {{ fileName }} · 点击可更换</p>
  </div>

  <div v-if="error" class="error-box" style="margin: 12px 0">✗ {{ error }}</div>

  <template v-if="parsed">
    <div class="panel" style="margin: 14px 0">
      <div class="row">
        <label v-if="sheets.length > 1" class="ctrl">
          <span class="field-label" style="margin: 0">工作表</span>
          <select :value="activeSheet" class="select" style="width: 160px" @change="switchSheet($event.target.value)">
            <option v-for="s in sheets" :key="s" :value="s">{{ s }}</option>
          </select>
        </label>
        <label class="ctrl">
          <span class="field-label" style="margin: 0">目标表名</span>
          <input v-model="table" class="input" style="width: 160px; font-family: var(--mono)" spellcheck="false" />
        </label>
        <div class="ctrl">
          <span class="field-label" style="margin: 0">数据库方言</span>
          <div class="row" style="gap: 6px" role="radiogroup" aria-label="方言">
            <button class="btn btn-sm" :class="{ 'btn-primary': dialect === 'mysql' }" role="radio" :aria-checked="dialect === 'mysql'" @click="dialect = 'mysql'">MySQL(反引号)</button>
            <button class="btn btn-sm" :class="{ 'btn-primary': dialect === 'postgres' }" role="radio" :aria-checked="dialect === 'postgres'" @click="dialect = 'postgres'">PostgreSQL(双引号)</button>
          </div>
        </div>
        <div class="ctrl">
          <span class="field-label" style="margin: 0">语句形式</span>
          <div class="row" style="gap: 6px" role="radiogroup" aria-label="语句形式">
            <button class="btn btn-sm" :class="{ 'btn-primary': mode === 'batch' }" role="radio" :aria-checked="mode === 'batch'" @click="mode = 'batch'">多行合并</button>
            <button class="btn btn-sm" :class="{ 'btn-primary': mode === 'rows' }" role="radio" :aria-checked="mode === 'rows'" @click="mode = 'rows'">每行一条</button>
          </div>
        </div>
        <label class="check" style="align-self: flex-end">
          <input v-model="emptyAsNull" type="checkbox" />
          空单元格输出 NULL
        </label>
      </div>
      <p class="tip" style="margin-top: 10px">
        共 {{ parsed.rows.length }} 行 × {{ parsed.headers.length }} 列;日期单元格按 YYYY-MM-DD HH:MM:SS 输出,字符串自动转义单引号。
      </p>
    </div>

    <div v-if="result.error" class="error-box" style="margin-bottom: 14px">✗ {{ result.error }}</div>

    <template v-else-if="result.text">
      <label class="field-label" for="xs-out">SQL(共 {{ result.count }} 行数据)</label>
      <textarea id="xs-out" class="textarea" style="min-height: 260px; font-size: 13px" readonly :value="result.text"></textarea>
      <div class="row" style="margin-top: 10px">
        <button class="btn btn-sm btn-primary" @click="copy('xlsxsql', result.text)">
          {{ copiedKey === 'xlsxsql' ? '✓ 已复制' : '复制 SQL' }}
        </button>
        <button class="btn btn-sm" @click="downloadSql">⬇️ 下载 .sql 文件</button>
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
.ctrl {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
</style>
