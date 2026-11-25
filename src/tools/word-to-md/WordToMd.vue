<script setup>
import AppIcon from '@/components/AppIcon.vue'
import CopyButton from '@/components/CopyButton.vue'
import { computed, ref } from 'vue'
import mammoth from 'mammoth/mammoth.browser'
import { downloadBlob } from '@/utils/image'
import { docxHtmlToMarkdown } from '@/utils/wordToMd'

const fileInput = ref(null)
const dragging = ref(false)
const file = ref(null)
const html = ref('')
const busy = ref(false)
const error = ref('')
const messages = ref([])
const keepImages = ref(true)

const result = computed(() => {
  if (!html.value) return { md: '', error: '', images: 0 }
  return docxHtmlToMarkdown(html.value, { keepImages: keepImages.value })
})

const stats = computed(() => {
  const md = result.value.md
  if (!md) return ''
  return `${md.length} 字符 · ${md.split('\n').length} 行${result.value.images ? ` · ${result.value.images} 张内嵌图` : ''}`
})

// 大图转 base64 后可能几十万字符,截断预览避免一次渲染卡死;复制/下载仍是全文
const PREVIEW_LIMIT = 50000
const preview = computed(() =>
  result.value.md.length > PREVIEW_LIMIT ? result.value.md.slice(0, PREVIEW_LIMIT) : result.value.md,
)
const truncated = computed(() => result.value.md.length > PREVIEW_LIMIT)

const mdName = computed(() => {
  const base = file.value?.name?.replace(/\.docx$/i, '') || 'document'
  return `${base}.md`
})

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
  if (!/\.docx$/i.test(f.name)) {
    error.value = '仅支持 .docx 格式(旧版 .doc 为二进制格式,请先用 Word 另存为 .docx)'
    return
  }
  file.value = f
  busy.value = true
  try {
    const arrayBuffer = await f.arrayBuffer()
    const out = await mammoth.convertToHtml({ arrayBuffer })
    html.value = out.value
    messages.value = out.messages.slice(0, 3).map((m) => m.message)
  } catch (e) {
    error.value = '解析失败:' + (e.message || e)
  } finally {
    busy.value = false
  }
}

function downloadMd() {
  downloadBlob(new Blob([result.value.md], { type: 'text/markdown;charset=utf-8' }), mdName.value)
}
</script>

<template>
  <p class="tip mb-14">
    用 mammoth 解析 .docx,再转换为 Markdown(标题 / 列表 / 粗斜体 / 链接 / 表格 / 代码)。
    文档全程在浏览器本地解析,不上传;⚠️ 仅支持 .docx,不支持旧版 .doc。
  </p>

  <div
    class="dropzone"
    :class="{ dragging }"
    @click="pick"
    @dragover.prevent="dragging = true"
    @dragleave.prevent="dragging = false"
    @drop.prevent="onDrop"
  >
    <input ref="fileInput" type="file" accept=".docx" class="sr-only" @change="onFileChange" />
    <div class="dz-icon"><AppIcon name="file-code" :size="30" /></div>
    <p><strong>点击选择 Word 文档(.docx)</strong> 或拖拽到此处</p>
    <p class="tip">转换后可复制或下载 .md 文件</p>
  </div>

  <div v-if="busy" class="tip mt-12">正在解析文档…</div>
  <div v-if="error" class="error-box mt-12">✗ {{ error }}</div>
  <div v-if="result.error" class="error-box mt-12">✗ {{ result.error }}</div>

  <template v-if="result.md">
    <div class="row mt-14 row-wrap">
      <CopyButton class="btn btn-sm btn-primary" :text="result.md" label="复制 Markdown" />
      <button class="btn btn-sm" @click="downloadMd"><AppIcon name="download" :size="15" /> 下载 .md</button>
      <span class="tip">{{ file?.name }} → {{ mdName }}</span>
    </div>

    <div class="panel mt-12">
      <div class="row row-wrap">
        <label class="check">
          <input v-model="keepImages" type="checkbox" />
          保留内嵌图片(base64)
        </label>
        <span class="tip">关闭后图片只留占位文字,适合纯文字笔记</span>
      </div>
      <p v-if="result.images" class="tip mt-8">
        <template v-if="keepImages">文档含 {{ result.images }} 张图,base64 会让 .md 体积明显变大。</template>
        <template v-else>已移除 {{ result.images }} 张内嵌图片。</template>
      </p>
      <p v-if="messages.length" class="tip mt-8">
        ⚠️ 部分复杂排版被简化:{{ messages[0] }}{{ messages.length > 1 ? ' …' : '' }}
      </p>
    </div>

    <div class="field mt-12">
      <label class="field-label">Markdown({{ stats }})</label>
      <pre class="output md-output">{{ preview }}</pre>
      <p v-if="truncated" class="tip mt-6">预览只显示前 5 万字符,复制 / 下载会得到完整 Markdown。</p>
    </div>

    <p class="tip mt-8">
      mammoth 会忽略页眉页脚、文本框、批注与浮动排版;需要保留精确版式请直接使用 Word 或转 PDF。
    </p>
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
  margin-bottom: 6px;
}
.dropzone p {
  margin: 4px 0;
}
</style>