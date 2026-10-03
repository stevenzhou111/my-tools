<script setup>
import { ref } from 'vue'
import { loadPdf } from '@/utils/pdfjs'
import { docxBlob } from '@/utils/docx'
import { downloadBlob, downloadCanvas } from '@/utils/image'
import { useCopy } from '@/utils/useCopy'

const fileInput = ref(null)
const dragging = ref(false)
const file = ref(null)
const pageCount = ref(0)
const busy = ref(false)
const progress = ref(0)
const error = ref('')
const text = ref('')
const { copiedKey, copy } = useCopy()

function pick() {
  fileInput.value?.click()
}
function onFileChange(e) {
  const f = e.target.files?.[0]
  if (f) process(f)
  e.target.value = ''
}
function onDrop(e) {
  dragging.value = false
  const f = e.dataTransfer?.files?.[0]
  if (f) process(f)
}

async function process(f) {
  error.value = ''
  text.value = ''
  if (!/\.pdf$/i.test(f.name)) return (error.value = '请选择 PDF 文件')
  file.value = f
  busy.value = true
  progress.value = 0
  try {
    const bytes = await f.arrayBuffer()
    const doc = await loadPdf(bytes.slice(0))
    pageCount.value = doc.numPages
    const lines = []
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const content = await page.getTextContent()
      lines.push(`—— 第 ${i} 页 ——`)
      let line = ''
      let lastEnd = null
      for (const item of content.items) {
        // 相邻文字片段水平间隙超过 1pt 时补空格,避免英文单词粘连
        const x = item.transform[4]
        if (lastEnd !== null && x - lastEnd > 1 && line && !/\s$/.test(line) && !/^\s/.test(item.str)) {
          line += ' '
        }
        line += item.str
        lastEnd = x + (item.width || 0)
        if (item.hasEOL) {
          lines.push(line)
          line = ''
          lastEnd = null
        }
      }
      if (line.trim()) lines.push(line)
      progress.value = Math.round((i / doc.numPages) * 100)
    }
    text.value = lines.join('\n')
  } catch (e) {
    error.value = '提取失败:' + (e.message || e)
  } finally {
    busy.value = false
  }
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function downloadTxt() {
  downloadBlob(new Blob([text.value], { type: 'text/plain;charset=utf-8' }), file.value.name.replace(/\.pdf$/i, '') + '.txt')
}

function buildHtml() {
  const body = text.value
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => (l.startsWith('—— 第') ? `<h3>${escapeHtml(l)}</h3>` : `<p>${escapeHtml(l)}</p>`))
    .join('\n')
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>${file.value.name.replace(/\.pdf$/i, '')}</title>
<style>body{font-family:system-ui,sans-serif;max-width:760px;margin:32px auto;padding:0 16px;line-height:1.8;color:#222}h3{color:#555;font-size:14px;border-top:1px solid #ddd;padding-top:14px}p{margin:6px 0}</style>
</head>
<body>
${body}
</body>
</html>`
}

function downloadHtml() {
  downloadBlob(new Blob([buildHtml()], { type: 'text/html;charset=utf-8' }), file.value.name.replace(/\.pdf$/i, '') + '.html')
}

function printHtml() {
  const w = window.open('', '_blank')
  if (!w) return (error.value = '浏览器拦截了新窗口,请允许弹出窗口后重试')
  w.document.write(buildHtml())
  w.document.close()
  w.focus()
  w.print()
}

async function downloadWord() {
  busy.value = true
  try {
    // 页分隔行(—— 第 N 页 ——)加粗,与 HTML 导出的 h3 对应
    const blob = docxBlob(
      text.value
        .split('\n')
        .filter((l) => l.trim())
        .map((l) => ({ text: l, bold: l.startsWith('—— 第') })),
    )
    downloadBlob(blob, file.value.name.replace(/\.pdf$/i, '') + '.docx')
  } catch (e) {
    error.value = '生成 Word 失败:' + e.message
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
    <input ref="fileInput" type="file" accept="application/pdf" hidden @change="onFileChange" />
    <div class="dz-icon">📝</div>
    <p><strong>点击选择 PDF 文件</strong> 或拖拽到此处</p>
    <p class="tip">提取全部文字,可导出为 纯文本 / Word(.docx)/ HTML;⚠️ 仅提取文字,不含图片与排版</p>
  </div>

  <div v-if="error" class="error-box" style="margin-top: 12px">✗ {{ error }}</div>

  <div v-if="file" class="row" style="margin-top: 14px">
    <span class="tip">{{ file.name }} · {{ pageCount }} 页 · 提取出 {{ text.split('\n').filter((l) => l.trim()).length }} 行文字</span>
    <button class="btn btn-primary" :disabled="busy" @click="process(file)">
      {{ busy ? `提取中 ${progress}%` : '📝 重新提取' }}
    </button>
  </div>

  <div v-if="busy || progress" class="progress-wrap">
    <div class="progress-bar" :style="{ width: progress + '%' }"></div>
  </div>

  <template v-if="text">
    <pre class="output" style="margin-top: 14px">{{ text.slice(0, 4000) }}{{ text.length > 4000 ? '\n…(仅预览前 4000 字符,导出为完整内容)' : '' }}</pre>
    <div class="row" style="margin-top: 12px">
      <button class="btn btn-sm" @click="copy('txt', text)">
        {{ copiedKey === 'txt' ? '✓ 已复制' : '复制文本' }}
      </button>
      <button class="btn btn-sm" @click="downloadTxt">⬇️ 纯文本 .txt</button>
      <button class="btn btn-sm" @click="downloadWord">⬇️ Word .docx</button>
      <button class="btn btn-sm" @click="downloadHtml">⬇️ HTML</button>
      <button class="btn btn-sm" @click="printHtml">🖨️ 打印 / 存为 PDF</button>
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
.progress-wrap {
  margin-top: 12px;
  height: 8px;
  background: var(--bg-soft);
  border-radius: 6px;
  overflow: hidden;
}
.progress-bar {
  height: 100%;
  background: var(--accent-grad);
  border-radius: 6px;
  transition: width 0.2s;
}
</style>
