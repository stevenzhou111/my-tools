<script setup>
import { ref } from 'vue'
import { zipSync, unzipSync } from 'fflate'
import { downloadBlob } from '@/utils/image'

const tab = ref('compress')
const zipInput = ref(null)
const fileInput = ref(null)
const files = ref([])
const busy = ref(false)
const error = ref('')
const entries = ref([]) // 解压结果 { name, size }

function pickZip() {
  zipInput.value?.click()
}
function pickFiles() {
  fileInput.value?.click()
}
function onFilesChange(e) {
  for (const f of e.target.files || []) files.value.push(f)
  e.target.value = ''
}

async function compress() {
  error.value = ''
  if (!files.value.length) return (error.value = '请先选择要压缩的文件')
  busy.value = true
  try {
    const map = {}
    for (const f of files.value) {
      // 同名文件按原路径打包会被覆盖,追加序号保留全部文件
      let name = f.name
      let n = 2
      while (name in map) name = f.name.replace(/(\.[^.]*)?$/, `(${n++})$1`)
      map[name] = new Uint8Array(await f.arrayBuffer())
    }
    const zipped = zipSync(map, { level: 6 })
    downloadBlob(new Blob([zipped], { type: 'application/zip' }), 'archive-' + Date.now() + '.zip')
  } catch (e) {
    error.value = '压缩失败:' + e.message
  } finally {
    busy.value = false
  }
}

function onZipChange(e) {
  const f = e.target.files?.[0]
  if (f) extract(f)
  e.target.value = ''
}
async function onZipDrop(e) {
  const f = e.dataTransfer?.files?.[0]
  if (f) extract(f)
}

async function extract(file) {
  error.value = ''
  entries.value = []
  if (!/\.zip$/i.test(file.name)) return (error.value = '请选择 ZIP 文件')
  busy.value = true
  try {
    // 限制单文件解压后大小,防范 zip 炸弹拖垮页面
    const MAX_ENTRY = 200 * 1024 * 1024
    const unzipped = unzipSync(new Uint8Array(await file.arrayBuffer()), {
      filter: (f) => f.originalSize <= MAX_ENTRY,
    })
    entries.value = Object.entries(unzipped)
      .filter(([name, data]) => !name.endsWith('/') && data.length > 0)
      .map(([name, data]) => ({ name, data, size: data.length }))
    if (!entries.value.length) error.value = 'ZIP 中没有可提取的文件'
  } catch (e) {
    error.value = '解压失败:' + e.message
  } finally {
    busy.value = false
  }
}

function downloadEntry(entry) {
  downloadBlob(new Blob([entry.data]), entry.name.split('/').pop())
}

function previewText(entry) {
  try {
    // 严格 UTF-8 解码,失败即视为二进制文件
    return new TextDecoder('utf-8', { fatal: true }).decode(entry.data.slice(0, 200 * 1024)).slice(0, 500)
  } catch {
    return '(二进制文件,无法预览)'
  }
}
</script>

<template>
  <div class="row" style="margin-bottom: 16px">
    <button class="btn" :class="{ 'btn-primary': tab === 'compress' }" @click="tab = 'compress'">📦 压缩为 ZIP</button>
    <button class="btn" :class="{ 'btn-primary': tab === 'extract' }" @click="tab = 'extract'">📂 解压 ZIP</button>
  </div>

  <div v-if="error" class="error-box" style="margin-bottom: 12px">✗ {{ error }}</div>

  <!-- 压缩 -->
  <template v-if="tab === 'compress'">
    <div class="dropzone" @click="pickFiles">
      <input ref="fileInput" type="file" multiple hidden @change="onFilesChange" />
      <div class="dz-icon">📦</div>
      <p><strong>点击选择文件</strong>(可多选,按原文件名打包)</p>
    </div>
    <div v-if="files.length" class="panel" style="margin-top: 14px">
      <div v-for="(f, i) in files" :key="i" class="file-row">
        <span class="file-name">{{ f.name }}</span>
        <span class="tip">{{ (f.size / 1024).toFixed(1) }} KB</span>
        <button class="btn btn-sm" @click="files.splice(i, 1)">✕</button>
      </div>
    </div>
    <div v-if="files.length" class="row" style="margin-top: 14px">
      <button class="btn btn-primary" :disabled="busy" @click="compress">
        {{ busy ? '压缩中…' : `📦 打包 ${files.length} 个文件` }}
      </button>
      <button class="btn" @click="files = []">清空</button>
    </div>
  </template>

  <!-- 解压 -->
  <template v-else>
    <div class="dropzone" @click="pickZip" @dragover.prevent @drop.prevent="onZipDrop">
      <input ref="zipInput" type="file" accept=".zip" hidden @change="onZipChange" />
      <div class="dz-icon">📂</div>
      <p><strong>点击选择 ZIP 文件</strong> 或拖拽到此处</p>
      <p class="tip">解压在浏览器本地完成,可选择其中文件单独下载</p>
    </div>
    <div v-if="entries.length" class="panel" style="margin-top: 14px">
      <label class="field-label">共 {{ entries.length }} 个文件</label>
      <details v-for="(en, i) in entries" :key="i" class="entry">
        <summary>
          <span class="file-name">{{ en.name }}</span>
          <span class="tip">{{ (en.size / 1024).toFixed(1) }} KB</span>
          <button class="btn btn-sm" @click.stop="downloadEntry(en)">⬇️ 下载</button>
        </summary>
        <pre v-if="en.size < 200 * 1024" class="output preview-box">{{ previewText(en) }}</pre>
      </details>
    </div>
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
.file-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  border-bottom: 1px dashed var(--border);
  font-size: 15px;
}
.file-row:last-child { border-bottom: none; }
.file-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}
.entry {
  border-bottom: 1px dashed var(--border);
  padding: 6px 0;
}
.entry:last-child { border-bottom: none; }
.entry summary {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 15px;
  list-style: none;
}
.entry summary::-webkit-details-marker { display: none; }
.preview-box {
  margin-top: 8px;
  max-height: 200px;
}
</style>
