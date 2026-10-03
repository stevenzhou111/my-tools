<script setup>
import { ref } from 'vue'
import SparkMD5 from 'spark-md5'
import { useCopy } from '@/utils/useCopy'

const fileInput = ref(null)
const file = ref(null)
const busy = ref(false)
const error = ref('')
const results = ref([]) // { algo, hex }
const dragging = ref(false)
const { copiedKey, copy } = useCopy()

const ALGOS = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512']

function pick() {
  fileInput.value?.click()
}
function onFileChange(e) {
  const f = e.target.files?.[0]
  if (f) load(f)
  e.target.value = ''
}
function onDrop(e) {
  dragging.value = false
  const f = e.dataTransfer?.files?.[0]
  if (f) load(f)
}

// MD5 分块增量计算,避免大文件一次性占用双倍内存
async function md5File(file) {
  const spark = new SparkMD5.ArrayBuffer()
  const chunkSize = 4 * 1024 * 1024
  for (let pos = 0; pos < file.size; pos += chunkSize) {
    spark.append(await file.slice(pos, pos + chunkSize).arrayBuffer())
  }
  return spark.end()
}

async function load(f) {
  error.value = ''
  results.value = []
  file.value = f
  busy.value = true
  try {
    const out = [{ algo: 'MD5', hex: await md5File(f) }]
    // SHA 系列由 Web Crypto 一次性计算,超大文件会占用相应内存
    if (f.size <= 256 * 1024 * 1024) {
      const buf = await f.arrayBuffer()
      for (const algo of ALGOS) {
        const digest = await crypto.subtle.digest(algo, buf)
        out.push({
          algo,
          hex: [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join(''),
        })
      }
    } else {
      out.push({ algo: 'SHA 系列', hex: '文件超过 256MB,已跳过(Web Crypto 不支持流式哈希)' })
    }
    results.value = out
  } catch (e) {
    error.value = '计算失败:' + e.message
  } finally {
    busy.value = false
  }
}

function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
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
    <input ref="fileInput" type="file" hidden @change="onFileChange" />
    <div class="dz-icon">📥</div>
    <p><strong>点击选择任意文件</strong> 或拖拽到此处</p>
    <p class="tip">计算 MD5 / SHA 系列哈希,用于校验下载文件完整性,全程本地处理</p>
  </div>

  <div v-if="error" class="error-box" style="margin-top: 12px">✗ {{ error }}</div>

  <template v-if="file">
    <p class="tip" style="margin: 12px 0">
      {{ file.name }} · {{ fmtSize(file.size) }} <span v-if="busy">· 计算中…</span>
    </p>

    <div v-for="r in results" :key="r.algo" class="panel hash-row">
      <div class="hash-head">
        <span class="hash-algo">{{ r.algo }}</span>
        <button class="btn btn-sm" @click="copy(r.algo, r.hex)">
          {{ copiedKey === r.algo ? '✓ 已复制' : '复制' }}
        </button>
      </div>
      <pre class="output hash-hex">{{ r.hex }}</pre>
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
.hash-row {
  margin-bottom: 10px;
  padding: 12px;
}
.hash-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.hash-algo {
  font-size: 14px;
  font-weight: 600;
  color: var(--accent);
}
.hash-hex {
  background: var(--bg-soft);
  max-height: 100px;
}
</style>
