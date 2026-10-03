<script setup>
import { ref } from 'vue'
import mammoth from 'mammoth/mammoth.browser'
import { downloadBlob } from '@/utils/image'

const fileInput = ref(null)
const dragging = ref(false)
const file = ref(null)
const busy = ref(false)
const error = ref('')
const html = ref('')
const messages = ref([])
const showSource = ref(false)

const STYLED = (body) => `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>${file.value?.name?.replace(/\.docx$/i, '') || 'document'}</title>
<style>
body{font-family:system-ui,'Microsoft YaHei',sans-serif;max-width:820px;margin:32px auto;padding:0 20px;line-height:1.8;color:#24292f}
img{max-width:100%}
table{border-collapse:collapse;width:100%}
td,th{border:1px solid #d0d7de;padding:6px 10px}
h1,h2,h3{line-height:1.4}
</style>
</head>
<body>
${body}
</body>
</html>`

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
  html.value = ''
  messages.value = []
  if (!/\.docx$/i.test(f.name)) return (error.value = '仅支持 .docx 格式(旧版 .doc 为二进制格式,浏览器无法解析,请先用 Word 另存为 .docx)')
  file.value = f
  busy.value = true
  try {
    const arrayBuffer = await f.arrayBuffer()
    const result = await mammoth.convertToHtml({ arrayBuffer })
    html.value = result.value
    messages.value = result.messages.slice(0, 5).map((m) => m.message)
  } catch (e) {
    error.value = '解析失败:' + (e.message || e)
  } finally {
    busy.value = false
  }
}

function downloadHtml() {
  downloadBlob(new Blob([STYLED(html.value)], { type: 'text/html;charset=utf-8' }), file.value.name.replace(/\.docx$/i, '') + '.html')
}

function printHtml() {
  const w = window.open('', '_blank')
  if (!w) return (error.value = '浏览器拦截了新窗口,请允许弹出窗口后重试')
  w.document.write(STYLED(html.value))
  w.document.close()
  w.focus()
  w.print()
}

async function copyHtml() {
  try {
    await navigator.clipboard.writeText(html.value)
  } catch {
    error.value = '复制失败:浏览器拒绝了剪贴板访问,请改用「下载 .html」'
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
    <input ref="fileInput" type="file" accept=".docx" hidden @change="onFileChange" />
    <div class="dz-icon">📃</div>
    <p><strong>点击选择 Word 文档(.docx)</strong> 或拖拽到此处</p>
    <p class="tip">解析为 HTML 预览,可复制 / 下载 / 直接打印存为 PDF;⚠️ 仅支持 .docx,不支持旧版 .doc</p>
  </div>

  <div v-if="error" class="error-box" style="margin-top: 12px">✗ {{ error }}</div>

  <template v-if="html">
    <div class="row" style="margin-top: 14px">
      <button class="btn btn-sm" :class="{ 'btn-primary': !showSource }" @click="showSource = false">👁 预览</button>
      <button class="btn btn-sm" :class="{ 'btn-primary': showSource }" @click="showSource = true">&lt;/&gt; 源码</button>
      <button class="btn btn-sm" @click="copyHtml">📋 复制 HTML</button>
      <button class="btn btn-sm" @click="downloadHtml">⬇️ 下载 .html</button>
      <button class="btn btn-sm btn-primary" @click="printHtml">🖨️ 打印 / 存为 PDF</button>
    </div>

    <p v-if="messages.length" class="tip" style="margin-top: 10px">
      ⚠️ 部分复杂元素被简化:{{ messages[0] }}{{ messages.length > 1 ? ` 等 ${messages.length} 项` : '' }}
    </p>

    <iframe
      v-if="!showSource"
      :srcdoc="STYLED(html)"
      class="preview-frame"
      title="文档预览"
    ></iframe>
    <pre v-else class="output" style="margin-top: 12px">{{ html.slice(0, 8000) }}{{ html.length > 8000 ? '\n…' : '' }}</pre>
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
.preview-frame {
  width: 100%;
  height: 560px;
  margin-top: 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #fff;
}
</style>
