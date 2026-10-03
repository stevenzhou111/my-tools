<script setup>
import { ref } from 'vue'
import { PDFDocument, degrees } from 'pdf-lib'
import { zipSync } from 'fflate'
import { downloadBlob } from '@/utils/image'

const fileInput = ref(null)
const file = ref(null)
const pageCount = ref(0)
const docRef = ref(null)
const rangeText = ref('1-3')
const busy = ref(false)
const error = ref('')

function pick() {
  fileInput.value?.click()
}
async function onFileChange(e) {
  const f = e.target.files?.[0]
  if (!f) return
  error.value = ''
  try {
    const doc = await PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: true })
    if (doc.isEncrypted) return (error.value = '该 PDF 已加密,请先解密后再操作')
    docRef.value = doc
    file.value = f
    pageCount.value = doc.getPageCount()
  } catch (err) {
    error.value = '读取 PDF 失败:' + err.message
  }
}

// "1-3,5,8-9" → [0,1,2,4,7,8](0-based)
function parseRanges(text, max) {
  const pages = new Set()
  for (const part of text.split(/[,，]/)) {
    const p = part.trim()
    if (!p) continue
    const m = p.match(/^(\d+)(?:\s*-\s*(\d+))?$/)
    if (!m) throw new Error(`页码「${p}」格式不对,示例:1-3,5`)
    const a = Number(m[1])
    const b = m[2] ? Number(m[2]) : a
    if (a < 1 || b > max || a > b) throw new Error(`页码「${p}」超出范围(1 ~ ${max})`)
    for (let i = a; i <= b; i++) pages.add(i - 1)
  }
  return [...pages].sort((x, y) => x - y)
}

// 自定义页序:按书写顺序展开,允许重复与任意排列(如 3,1-2,3)
function parseOrder(text, max) {
  const pages = []
  for (const part of text.split(/[,，]/)) {
    const p = part.trim()
    if (!p) continue
    const m = p.match(/^(\d+)(?:\s*-\s*(\d+))?$/)
    if (!m) throw new Error(`页码「${p}」格式不对,示例:3,1-2`)
    const a = Number(m[1])
    const b = m[2] ? Number(m[2]) : a
    if (a < 1 || b > max || a > b) throw new Error(`页码「${p}」超出范围(1 ~ ${max})`)
    for (let i = a; i <= b; i++) pages.push(i - 1)
  }
  if (!pages.length) throw new Error('请填写新页序')
  return pages
}

async function makeDoc(src, indices) {
  const out = await PDFDocument.create()
  const pages = await out.copyPages(src, indices)
  pages.forEach((p) => out.addPage(p))
  return out
}

async function run(op) {
  error.value = ''
  const src = docRef.value
  if (!src) return (error.value = '请先选择 PDF 文件')
  const baseName = file.value.name.replace(/\.pdf$/i, '')

  // 重排走独立分支:按输入顺序展开,允许重复页
  if (op === 'reorder') {
    let order
    try {
      order = parseOrder(rangeText.value, pageCount.value)
    } catch (e) {
      return (error.value = e.message)
    }
    busy.value = true
    try {
      const out = await makeDoc(src, order)
      downloadBlob(new Blob([await out.save()], { type: 'application/pdf' }), `${baseName}-重排.pdf`)
    } catch (e) {
      error.value = '操作失败:' + e.message
    } finally {
      busy.value = false
    }
    return
  }

  let indices
  try {
    indices = parseRanges(rangeText.value, pageCount.value)
  } catch (e) {
    return (error.value = e.message)
  }
  if (!indices.length) return (error.value = '请填写要操作的页码')
  busy.value = true
  try {
    if (op === 'extract') {
      const out = await makeDoc(src, indices)
      downloadBlob(new Blob([await out.save()], { type: 'application/pdf' }), `${baseName}-提取${indices.length}页.pdf`)
    } else if (op === 'delete') {
      const keep = src.getPageIndices().filter((i) => !indices.includes(i))
      if (!keep.length) return (error.value = '不能删除所有页面')
      const out = await makeDoc(src, keep)
      downloadBlob(new Blob([await out.save()], { type: 'application/pdf' }), `${baseName}-删除${indices.length}页.pdf`)
    } else if (op === 'rotate') {
      const out = await PDFDocument.load(await src.save(), { ignoreEncryption: true })
      for (const i of indices) {
        const page = out.getPage(i)
        page.setRotation(degrees((page.getRotation().angle + 90) % 360))
      }
      downloadBlob(new Blob([await out.save()], { type: 'application/pdf' }), `${baseName}-旋转.pdf`)
    } else if (op === 'split') {
      const zipEntries = {}
      for (const i of indices) {
        const out = await makeDoc(src, [i])
        zipEntries[`${baseName}-第${i + 1}页.pdf`] = await out.save()
      }
      const zipped = zipSync(zipEntries)
      downloadBlob(new Blob([zipped], { type: 'application/zip' }), `${baseName}-拆分.zip`)
    }
  } catch (e) {
    error.value = '操作失败:' + e.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="dropzone" @click="pick">
    <input ref="fileInput" type="file" accept="application/pdf" hidden @change="onFileChange" />
    <div class="dz-icon">📑</div>
    <p v-if="!file"><strong>点击选择 PDF 文件</strong></p>
    <p v-else><strong>{{ file.name }}</strong> · 共 {{ pageCount }} 页</p>
  </div>

  <div v-if="error" class="error-box" style="margin-top: 12px">✗ {{ error }}</div>

  <div v-if="docRef" class="panel" style="margin-top: 14px">
    <div class="field">
      <label class="field-label">页码范围(如 1-3,5,8-9;重排时允许任意顺序与重复)</label>
      <input v-model="rangeText" class="input" spellcheck="false" />
    </div>
    <div class="row">
      <button class="btn btn-primary" :disabled="busy" @click="run('extract')">📤 提取所选页面</button>
      <button class="btn" :disabled="busy" @click="run('delete')">🗑️ 删除所选页面</button>
      <button class="btn" :disabled="busy" @click="run('rotate')">🔄 所选页旋转 90°</button>
      <button class="btn" :disabled="busy" @click="run('reorder')">🔀 按此页序重排</button>
      <button class="btn" :disabled="busy" @click="run('split')">✂️ 逐页拆分为 ZIP</button>
    </div>
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
</style>
