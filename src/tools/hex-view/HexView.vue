<script setup>
import { computed, ref } from 'vue'
import { useCopy } from '@/utils/useCopy'

const file = ref(null)
const offset = ref(0)
const pageBytes = 512
const data = ref(null) // Uint8Array
const error = ref('')
const gotoText = ref('')
const { copiedKey, copy } = useCopy()

function pick() {
  error.value = ''
  file.value = null
  data.value = null
  offset.value = 0
}
function onFileChange(e) {
  const f = e.target.files?.[0]
  e.target.value = ''
  if (f) load(f)
}
function onDrop(e) {
  const f = e.dataTransfer?.files?.[0]
  if (f) load(f)
}

async function load(f) {
  error.value = ''
  // 按需 slice 读取,几 GB 的文件也不会整块进内存
  const buf = await f.slice(0, pageBytes).arrayBuffer()
  file.value = f
  data.value = new Uint8Array(buf)
  offset.value = 0
  gotoText.value = '0'
}

const pageCount = computed(() => (file.value ? Math.ceil(file.value.size / pageBytes) : 0))
const pageIndex = computed(() => Math.floor(offset.value / pageBytes))

async function goTo(off) {
  if (!file.value) return
  off = Math.max(0, Math.min(off, Math.max(0, file.value.size - 1)))
  const buf = await file.value.slice(off, off + pageBytes).arrayBuffer()
  data.value = new Uint8Array(buf)
  offset.value = off
  gotoText.value = String(off)
}
function jump() {
  const n = Number(gotoText.value)
  if (!Number.isFinite(n) || n < 0) return (error.value = '偏移量应为非负整数(支持十进制)')
  error.value = ''
  goTo(Math.floor(n))
}
function page(delta) {
  goTo(offset.value + delta * pageBytes)
}

const HEX = '0123456789abcdef'
const rows = computed(() => {
  if (!data.value) return []
  const out = []
  for (let i = 0; i < data.value.length; i += 16) {
    const slice = data.value.subarray(i, i + 16)
    let hex = ''
    let ascii = ''
    for (let j = 0; j < 16; j++) {
      const b = j < slice.length ? slice[j] : null
      if (b === null) {
        hex += '   '
      } else {
        hex += HEX[b >> 4] + HEX[b & 15] + ' '
        ascii += b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : '·'
      }
      if (j === 7) hex += ' '
    }
    out.push({ addr: offset.value + i, hex, ascii })
  }
  return out
})

const dump = computed(() => rows.value.map((r) => `${r.addr.toString(16).padStart(8, '0')}  ${r.hex} |${r.ascii}|`).join('\n'))
</script>

<template>
  <p class="tip" style="margin-bottom: 14px">
    以十六进制 + ASCII 双栏查看任意文件的原始字节;按 512 字节分页按需读取,大文件也不会占用内存。排查文件头(Magic Number)、编码与二进制格式时很趁手。
  </p>

  <div class="dropzone" @click="pick" @dragover.prevent @drop.prevent="onDrop">
    <input type="file" class="sr-only" @change="onFileChange" aria-label="选择要查看的文件" />
    <div class="dz-icon">🔢</div>
    <p v-if="!file"><strong>点击选择任意文件</strong> 或拖拽到此处</p>
    <p v-else>{{ file.name }} · {{ file.size.toLocaleString() }} 字节 · 共 {{ pageCount }} 页</p>
  </div>

  <div v-if="error" class="error-box" style="margin-top: 12px">✗ {{ error }}</div>

  <template v-if="data">
    <div class="row mt-12">
      <button class="btn btn-sm" :disabled="offset === 0" @click="page(-1)">◀ 上一页</button>
      <button class="btn btn-sm" :disabled="pageIndex >= pageCount - 1" @click="page(1)">下一页 ▶</button>
      <span class="row" style="gap: 6px">
        <label class="field-label" for="hex-goto">跳转偏移(十进制)</label>
        <input id="hex-goto" v-model="gotoText" class="input mono" style="width: 130px" @keyup.enter="jump" />
        <button class="btn btn-sm" @click="jump">跳转</button>
      </span>
      <span class="tip">当前 0x{{ offset.toString(16).padStart(8, '0') }}(第 {{ pageIndex + 1 }}/{{ pageCount }} 页)</span>
      <button class="btn btn-sm" @click="copy('dump', dump)">{{ copiedKey === 'dump' ? '✓ 已复制' : '复制本页' }}</button>
    </div>

    <pre class="output hex-dump">{{ dump }}</pre>
  </template>
</template>

<style scoped>
.dropzone {
  border: 2px dashed var(--border);
  border-radius: var(--radius);
  padding: 36px 20px;
  text-align: center;
  cursor: pointer;
  color: var(--muted);
}
.dropzone:hover {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.dz-icon {
  font-size: 36px;
  margin-bottom: 6px;
}
.dropzone p { margin: 4px 0; }
.hex-dump {
  font-size: 12.5px;
  line-height: 1.6;
  user-select: all;
}
</style>
