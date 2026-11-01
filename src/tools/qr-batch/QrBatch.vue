<script setup>
import { computed, onUnmounted, ref } from 'vue'
import QRCode from 'qrcode'
import { zipSync } from 'fflate'
import { parseBatchLines, fileNameFor } from '@/utils/qrBatch'
import { downloadBlob } from '@/utils/image'
import { useUrlState } from '@/utils/urlState'

const input = ref('')
const size = ref(400)
const margin = ref(2)
const dark = ref('#1c2130')
const busy = ref(false)
const results = ref([]) // { text, name, url, size }
const error = ref('')

const num = (lo, hi) => (s) => {
  const v = Number(s)
  return Number.isFinite(v) && v >= lo && v <= hi ? v : undefined
}
useUrlState([
  { key: 'w', ref: size, parse: num(120, 1000) },
  { key: 'mg', ref: margin, parse: num(0, 10) },
])

const parsed = computed(() => parseBatchLines(input.value))

onUnmounted(() => {
  results.value.forEach((r) => URL.revokeObjectURL(r.url))
})

async function generate() {
  if (!parsed.value.items.length) return
  busy.value = true
  error.value = ''
  results.value.forEach((r) => URL.revokeObjectURL(r.url))
  results.value = []
  try {
    const canvas = document.createElement('canvas')
    for (const item of parsed.value.items) {
      await QRCode.toCanvas(canvas, item.text, {
        width: size.value,
        margin: margin.value,
        errorCorrectionLevel: 'M',
        color: { dark: dark.value, light: '#ffffff' },
      })
      const blob = await new Promise((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('编码失败'))), 'image/png'),
      )
      results.value.push({ text: item.text, name: fileNameFor(item, results.value.length), url: URL.createObjectURL(blob), blob, size: blob.size })
    }
  } catch {
    error.value = '生成失败:某些行的内容过长或包含无法编码的数据,可减少单行长度后重试'
  } finally {
    busy.value = false
  }
}

async function downloadAll() {
  if (!results.value.length) return
  busy.value = true
  try {
    const entries = {}
    for (const r of results.value) {
      entries[r.name] = new Uint8Array(await r.blob.arrayBuffer())
    }
    downloadBlob(new Blob([zipSync(entries)], { type: 'application/zip' }), `qrcodes-${results.value.length}.zip`)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="panel mb-16">
    <div class="label-row">
      <label class="field-label" for="qrbatch-in">每行一个内容(URL 或任意文本);可用「内容 | 文件名」自定义文件名</label>
      <span class="tip">最多 100 行,空行与重复行自动跳过</span>
    </div>
    <textarea
      id="qrbatch-in"
      v-model="input"
      v-draft="'qr-batch-in'"
      class="textarea src-area"
      spellcheck="false"
      placeholder="https://example.com/page-001&#10;https://example.com/page-002&#10;WiFi:188-8888-8888 | 联系电话"
    ></textarea>
    <p v-if="input" class="tip m-0 mt-8">
      解析到 {{ parsed.items.length }} 行<template v-if="parsed.skipped">(另跳过 {{ parsed.skipped }} 行:超限/重复/空)</template>
    </p>
  </div>

  <div class="panel mb-16">
    <div class="form-row">
      <label class="ctrl-inline">
        <span class="tip">尺寸 {{ size }}px</span>
        <input v-model.number="size" type="range" min="120" max="1000" step="20" />
      </label>
      <label class="ctrl-inline">
        <span class="tip">留白 {{ margin }}</span>
        <input v-model.number="margin" type="range" min="0" max="10" step="1" />
      </label>
      <label class="ctrl-inline">
        <span class="tip">前景色</span>
        <input v-model="dark" type="color" aria-label="二维码前景色" />
      </label>
      <button class="btn btn-primary" :disabled="!parsed.items.length || busy" @click="generate">
        {{ busy ? '生成中…' : `生成 ${parsed.items.length} 个二维码` }}
      </button>
    </div>
  </div>

  <div v-if="error" class="error-box mb-14">✗ {{ error }}</div>

  <template v-if="results.length">
    <div class="batch-grid">
      <figure v-for="r in results.slice(0, 12)" :key="r.name" class="batch-item">
        <img :src="r.url" :alt="`二维码 ${r.text}`" loading="lazy" />
        <figcaption :title="r.text">{{ r.name }}</figcaption>
      </figure>
      <div v-if="results.length > 12" class="more-tip">…其余 {{ results.length - 12 }} 个在 ZIP 里</div>
    </div>
    <div class="row mt-14">
      <button class="btn btn-primary" :disabled="busy" @click="downloadAll">下载全部({{ results.length }} 张,ZIP)</button>
      <span class="tip">单张也可在预览图上右键另存</span>
    </div>
  </template>
</template>

<style scoped>
.label-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}
.src-area {
  min-height: 150px;
  font-family: var(--mono);
  font-size: 13.5px;
}
.form-row {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: center;
}
.ctrl-inline {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}
.ctrl-inline input[type='range'] {
  width: 160px;
  accent-color: var(--accent);
}
.ctrl-inline input[type='color'] {
  width: 34px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--card);
  cursor: pointer;
}
.batch-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 14px;
}
.batch-item {
  margin: 0;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px;
  text-align: center;
}
.batch-item img {
  width: 100%;
  height: auto;
  border-radius: 8px;
  background: #fff;
}
.batch-item figcaption {
  margin-top: 6px;
  font-size: 12px;
  color: var(--muted);
  font-family: var(--mono);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.more-tip {
  grid-column: 1 / -1;
  text-align: center;
  color: var(--muted);
  font-size: 13.5px;
  padding: 8px;
}
</style>
