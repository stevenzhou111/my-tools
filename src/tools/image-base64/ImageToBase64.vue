<script setup>
import { computed, ref } from 'vue'
import { formatSize } from '@/utils/format'
import { useCopy } from '@/utils/useCopy'

const fileInput = ref(null)
const dataUrl = ref('')
const fileName = ref('')
const fileSize = ref(0)
const dimensions = ref('')
const error = ref('')
const dragging = ref(false)
const { copiedKey, copy } = useCopy()

const imgSnippet = computed(() => `<img src="${dataUrl.value}" alt="" />`)
const cssSnippet = computed(() => `background-image: url(${dataUrl.value});`)

function pick() {
  fileInput.value?.click()
}

function onFileChange(e) {
  const f = e.target.files?.[0]
  if (f) process(f)
}

function onDrop(e) {
  dragging.value = false
  const f = e.dataTransfer?.files?.[0]
  if (f) process(f)
}

let loadSeq = 0

function process(file) {
  error.value = ''
  dataUrl.value = ''
  if (!file.type.startsWith('image/')) {
    error.value = '请选择图片文件'
    return
  }
  // 竞态防护:快速连续放入多个文件时,只接受最新一次的结果
  const seq = ++loadSeq
  fileName.value = file.name
  fileSize.value = file.size
  const reader = new FileReader()
  reader.onload = () => {
    if (seq !== loadSeq) return
    dataUrl.value = reader.result
    const img = new Image()
    img.onload = () => {
      if (seq !== loadSeq) return
      dimensions.value = img.naturalWidth
        ? `${img.naturalWidth} × ${img.naturalHeight} px`
        : '未知(可能是 SVG)'
    }
    img.src = dataUrl.value
  }
  reader.onerror = () => {
    if (seq !== loadSeq) return
    error.value = '读取文件失败'
  }
  reader.readAsDataURL(file)
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
    <input ref="fileInput" type="file" accept="image/*" hidden @change="onFileChange" />
    <div class="dz-icon">🌉</div>
    <p><strong>点击选择图片</strong> 或拖拽图片到此处</p>
    <p class="tip">图片会被编码为 Data URL,可直接内联到 HTML / CSS 中</p>
  </div>

  <div v-if="error" class="error-box" style="margin-top: 12px">✗ {{ error }}</div>

  <template v-if="dataUrl">
    <div class="panel" style="margin-top: 14px">
      <div class="meta">
        <span><strong>{{ fileName }}</strong></span>
        <span class="tip">大小 {{ formatSize(fileSize) }}</span>
        <span v-if="dimensions" class="tip">{{ dimensions }}</span>
        <span class="tip">Base64 长度 {{ dataUrl.length }} 字符</span>
      </div>
      <img :src="dataUrl" class="preview" alt="预览" />
    </div>

    <div class="field" style="margin-top: 14px">
      <div class="snippet-head">
        <label class="field-label">Data URL</label>
        <button class="btn btn-sm" @click="copy('raw', dataUrl)">
          {{ copiedKey === 'raw' ? '✓ 已复制' : '复制' }}
        </button>
      </div>
      <pre class="output snippet">{{ dataUrl }}</pre>
    </div>

    <div class="field">
      <div class="snippet-head">
        <label class="field-label">&lt;img&gt; 标签</label>
        <button class="btn btn-sm" @click="copy('img', imgSnippet)">
          {{ copiedKey === 'img' ? '✓ 已复制' : '复制' }}
        </button>
      </div>
      <pre class="output snippet">{{ imgSnippet }}</pre>
    </div>

    <div class="field">
      <div class="snippet-head">
        <label class="field-label">CSS background</label>
        <button class="btn btn-sm" @click="copy('css', cssSnippet)">
          {{ copiedKey === 'css' ? '✓ 已复制' : '复制' }}
        </button>
      </div>
      <pre class="output snippet">{{ cssSnippet }}</pre>
    </div>

    <p class="tip">图片超过 100 KB 时,Data URL 会明显增大页面体积,建议只内联小图标。</p>
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
.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-bottom: 10px;
  font-size: 14px;
}
.preview {
  max-width: 100%;
  max-height: 260px;
  border-radius: 8px;
  background: var(--bg-soft);
}
.snippet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.snippet-head .field-label {
  margin-bottom: 0;
}
.snippet {
  max-height: 160px;
}
</style>
