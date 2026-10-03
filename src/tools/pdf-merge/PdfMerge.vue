<script setup>
import { ref } from 'vue'
import { PDFDocument } from 'pdf-lib'
import { downloadBlob } from '@/utils/image'

const fileInput = ref(null)
const files = ref([])
const busy = ref(false)
const error = ref('')

function pick() {
  fileInput.value?.click()
}
function onFileChange(e) {
  for (const f of e.target.files || []) files.value.push(f)
  e.target.value = ''
}
function remove(index) {
  files.value.splice(index, 1)
}
function move(index, delta) {
  const target = index + delta
  if (target < 0 || target >= files.value.length) return
  const arr = files.value
  ;[arr[index], arr[target]] = [arr[target], arr[index]]
}

async function merge() {
  error.value = ''
  if (files.value.length < 2) return (error.value = '请至少选择两个 PDF 文件')
  busy.value = true
  try {
    const out = await PDFDocument.create()
    for (const file of files.value) {
      const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true })
      if (src.isEncrypted) throw new Error(`「${file.name}」是加密 PDF,请先解密后再合并`)
      const pages = await out.copyPages(src, src.getPageIndices())
      pages.forEach((p) => out.addPage(p))
    }
    const saved = await out.save()
    downloadBlob(new Blob([saved], { type: 'application/pdf' }), 'merged.pdf')
  } catch (e) {
    error.value = '合并失败:' + e.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="dropzone" @click="pick">
    <input ref="fileInput" type="file" accept="application/pdf" multiple hidden @change="onFileChange" />
    <div class="dz-icon">🗂️</div>
    <p><strong>点击选择 PDF 文件</strong>(可多选,按列表顺序合并)</p>
    <p class="tip">全部在浏览器本地完成,PDF 不会上传</p>
  </div>

  <div v-if="error" class="error-box" style="margin-top: 12px">✗ {{ error }}</div>

  <div v-if="files.length" class="panel" style="margin-top: 14px">
    <label class="field-label">文件列表({{ files.length }})</label>
    <div v-for="(f, i) in files" :key="i" class="file-row">
      <span class="file-order">{{ i + 1 }}</span>
      <span class="file-name" :title="f.name">{{ f.name }}</span>
      <span class="tip">{{ (f.size / 1024).toFixed(0) }} KB</span>
      <button class="btn btn-sm" :disabled="i === 0" @click="move(i, -1)">↑</button>
      <button class="btn btn-sm" :disabled="i === files.length - 1" @click="move(i, 1)">↓</button>
      <button class="btn btn-sm" @click="remove(i)">✕</button>
    </div>
  </div>

  <div v-if="files.length" class="row" style="margin-top: 14px">
    <button class="btn btn-primary" :disabled="busy" @click="merge">
      {{ busy ? '合并中…' : `🔗 合并 ${files.length} 个文件` }}
    </button>
    <button class="btn" @click="files = []">清空列表</button>
  </div>
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
.file-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 0;
  border-bottom: 1px dashed var(--border);
  font-size: 15px;
}
.file-row:last-child {
  border-bottom: none;
}
.file-order {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.file-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
