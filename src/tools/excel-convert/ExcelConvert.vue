<script setup>
import AppIcon from '@/components/AppIcon.vue'
import { computed, ref } from 'vue'
import * as XLSX from 'xlsx'
import { useCopy } from '@/utils/useCopy'
import { downloadBlob } from '@/utils/image'

const fileInput = ref(null)
const fileName = ref('')
const workbook = ref(null)
const sheetNames = ref([])
const activeSheet = ref('')
const format = ref('json')
const error = ref('')
const { copiedKey, copy } = useCopy()

const FORMATS = [
  { id: 'json', label: 'JSON', ext: 'json', mime: 'application/json' },
  { id: 'csv', label: 'CSV', ext: 'csv', mime: 'text/csv' },
  { id: 'markdown', label: 'Markdown 表格', ext: 'md', mime: 'text/markdown' },
  { id: 'html', label: 'HTML 表格', ext: 'html', mime: 'text/html' },
  { id: 'tsv', label: 'TXT(Tab 分隔)', ext: 'txt', mime: 'text/plain' },
]

function pick() {
  fileInput.value?.click()
}

function onFileChange(e) {
  const f = e.target.files?.[0]
  if (!f) return
  const isCsv = /\.(csv|txt)$/i.test(f.name)
  const reader = new FileReader()
  reader.onload = () => {
    try {
      let wb
      if (isCsv) {
        // CSV 先按严格 UTF-8 解码,失败则回退 GBK(常见于中文 Excel 导出)
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
      workbook.value = wb
      sheetNames.value = wb.SheetNames
      activeSheet.value = wb.SheetNames[0]
      fileName.value = f.name.replace(/\.(xlsx|xls|csv)$/i, '')
      error.value = ''
    } catch (err) {
      error.value = '读取文件失败:' + err.message
      workbook.value = null
    }
  }
  reader.onerror = () => (error.value = '读取文件失败')
  reader.readAsArrayBuffer(f)
}

function toMarkdown(rows) {
  if (!rows.length) return '(空表格)'
  const width = Math.max(...rows.map((r) => r.length))
  const pad = (row) => {
    const cells = []
    for (let i = 0; i < width; i++) {
      const v = row[i] == null ? '' : String(row[i])
      cells.push(v.replace(/\|/g, '\\|').replace(/\n/g, ' '))
    }
    return cells
  }
  const header = pad(rows[0])
  const lines = [
    `| ${header.join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
  ]
  for (let i = 1; i < rows.length; i++) {
    lines.push(`| ${pad(rows[i]).join(' | ')} |`)
  }
  return lines.join('\n')
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// sheet_to_html 返回的是完整 HTML 文档,多工作表时会拼出多个 <html> 叠加的非法文档;
// 改为自行构建表格片段,统一包进一个文档
function toHtmlTable(rows, name) {
  const trs = rows.map((row, ri) => {
    const tag = ri === 0 ? 'th' : 'td'
    const tds = row.map((c) => `<${tag}>${escapeHtml(c == null ? '' : String(c))}</${tag}>`).join('')
    return `  <tr>${tds}</tr>`
  })
  return `<h2>${escapeHtml(name)}</h2>\n<table>\n${trs.join('\n')}\n</table>`
}

const HTML_SHELL = (body) => `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(fileName.value || '表格')}</title>
<style>body{font-family:system-ui,'Microsoft YaHei',sans-serif;max-width:900px;margin:32px auto;padding:0 16px;color:#24292f}table{border-collapse:collapse;width:100%;margin-bottom:24px}td,th{border:1px solid #d0d7de;padding:6px 10px}th{background:#f2f4f8}h2{font-size:16px}</style>
</head>
<body>
${body}
</body>
</html>`

const output = computed(() => {
  const wb = workbook.value
  if (!wb) return ''
  const fmt = FORMATS.find((f) => f.id === format.value)
  const parts = []
  for (const name of sheetNames.value) {
    const ws = wb.Sheets[name]
    let content = ''
    switch (fmt.id) {
      case 'json':
        content = JSON.stringify(XLSX.utils.sheet_to_json(ws), null, 2)
        break
      case 'csv':
        content = XLSX.utils.sheet_to_csv(ws)
        break
      case 'tsv':
        content = XLSX.utils.sheet_to_csv(ws, { FS: '\t' })
        break
      case 'markdown':
        content = toMarkdown(XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }))
        break
      case 'html':
        content = toHtmlTable(XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }), name)
        break
    }
    if (sheetNames.value.length > 1 && fmt.id !== 'html') {
      parts.push(`===== ${name} =====\n${content}`)
    } else {
      parts.push(content)
    }
  }
  const joined = parts.join('\n\n')
  return fmt.id === 'html' ? HTML_SHELL(joined) : joined
})

// 大表全量渲染进 <pre> 会冻结页面:预览截断,复制/下载走完整的 output
const PREVIEW_MAX = 20000
const previewOutput = computed(() => {
  const s = output.value
  return s.length > PREVIEW_MAX ? s.slice(0, PREVIEW_MAX) + '\n…(仅预览前 2 万字符,复制/下载为完整内容)' : s
})

const rowCount = computed(() => {
  if (!workbook.value) return 0
  const ws = workbook.value.Sheets[activeSheet.value]
  return ws ? XLSX.utils.sheet_to_json(ws, { header: 1 }).length : 0
})

function download() {
  const fmt = FORMATS.find((f) => f.id === format.value)
  downloadBlob(new Blob([output.value], { type: fmt.mime + ';charset=utf-8' }), `${fileName.value}.${fmt.ext}`)
}
</script>

<template>
  <div class="dropzone" @click="pick">
    <input ref="fileInput" type="file" accept=".xlsx,.xls,.csv,.txt" class="sr-only" @change="onFileChange" />
    <div class="dz-icon"><AppIcon name="book" :size="30" /></div>
    <p><strong>点击选择 Excel(.xlsx / .xls)或 CSV 文件</strong></p>
    <p class="tip">转换为 JSON / CSV / Markdown / HTML / TXT,全部本地解析</p>
  </div>

  <div v-if="error" class="error-box mt-12">✗ {{ error }}</div>

  <template v-if="workbook">
    <div class="row" style="margin: 14px 0">
      <label v-for="f in FORMATS" :key="f.id" class="check">
        <input v-model="format" type="radio" :value="f.id" />{{ f.label }}
      </label>
    </div>
    <div class="row mb-12">
      <span class="tip">
        工作簿共 {{ sheetNames.length }} 个工作表:{{ sheetNames.join('、') }}(当前「{{ activeSheet }}」约 {{ rowCount }} 行)
      </span>
    </div>

    <pre class="output">{{ previewOutput }}</pre>
    <div class="row mt-10">
      <button class="btn btn-sm" @click="copy('out', output)">
        {{ copiedKey === 'out' ? '✓ 已复制' : '复制内容' }}
      </button>
      <button class="btn btn-sm btn-primary" @click="download">⬇️ 下载文件</button>
    </div>
  </template>
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
</style>
