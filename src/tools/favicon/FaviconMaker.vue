<script setup>
import { computed, ref } from 'vue'
import { buildIco } from '@/utils/ico'
import { downloadBlob, loadImageFromFile } from '@/utils/image'
import { useUrlState } from '@/utils/urlState'

const SIZES = [16, 32, 48, 64, 128, 256]
const fileInput = ref(null)
const source = ref(null) // { img, url }
const previews = ref([]) // [{size, url}]
const busy = ref(false)
const error = ref('')

const siteName = ref('my-site')
useUrlState([{ key: 'n', ref: siteName, parse: (s) => (s.length <= 40 ? s : undefined) }])

const hasSource = computed(() => !!source.value)

function pick() {
  fileInput.value?.click()
}

async function onFile(e) {
  const f = e.target.files?.[0]
  e.target.value = ''
  if (!f) return
  await process(f)
}

async function onDrop(e) {
  const f = e.dataTransfer?.files?.[0]
  if (f) await process(f)
}

async function process(f) {
  error.value = ''
  if (!/\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(f.name)) {
    error.value = '请选择图片文件(PNG/JPG/WebP/GIF/SVG)'
    return
  }
  busy.value = true
  try {
    const img = await loadImageFromFile(f)
    const url = URL.createObjectURL(f)
    cleanup()
    source.value = { img, url, name: f.name }

    // 逐尺寸渲染预览
    previews.value = []
    for (const size of SIZES) {
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      ctx.imageSmoothingQuality = 'high'
      // cover 居中裁切,避免非正方形图标被拉扁
      const ratio = Math.max(size / img.naturalWidth, size / img.naturalHeight)
      const w = img.naturalWidth * ratio
      const h = img.naturalHeight * ratio
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
      previews.value.push({ size, url: URL.createObjectURL(blob), blob })
    }
  } catch (err) {
    error.value = err.message
  } finally {
    busy.value = false
  }
}

function cleanup() {
  if (source.value) URL.revokeObjectURL(source.value.url)
  previews.value.forEach((p) => URL.revokeObjectURL(p.url))
}

async function downloadIco() {
  if (!previews.value.length) return
  busy.value = true
  try {
    const frames = []
    for (const p of [...previews.value].sort((a, b) => a.size - b.size)) {
      frames.push({ size: p.size, data: new Uint8Array(await p.blob.arrayBuffer()) })
    }
    const blob = new Blob([buildIco(frames)], { type: 'image/x-icon' })
    downloadBlob(blob, `favicon-${siteName.value || 'site'}.ico`)
  } catch (e) {
    error.value = '生成 ICO 失败:' + e.message
  } finally {
    busy.value = false
  }
}

function downloadPng(size) {
  const p = previews.value.find((x) => x.size === size)
  if (p) downloadBlob(p.blob, `favicon-${size}.png`)
}
</script>

<template>
  <div
    class="dropzone"
    @click="pick"
    @dragover.prevent
    @drop.prevent="onDrop"
  >
    <input ref="fileInput" type="file" accept="image/*" hidden @change="onFile" />
    <p><strong>点击选择图片</strong> 或拖拽到此处</p>
    <p class="tip">建议 ≥ 256×256 的正方形 PNG/SVG;非正方形会居中裁切</p>
  </div>

  <div v-if="error" class="error-box" style="margin-top: 12px">✗ {{ error }}</div>

  <template v-if="hasSource">
    <div class="field" style="margin-top: 14px">
      <label class="field-label">站点标识(用于文件名)</label>
      <input v-model="siteName" class="input" style="max-width: 280px" spellcheck="false" />
    </div>

    <div class="row" style="margin: 10px 0 16px">
      <button class="btn btn-primary" :disabled="busy" @click="downloadIco">
        {{ busy ? '生成中…' : '下载 favicon.ico(含 6 个尺寸)' }}
      </button>
    </div>

    <label class="field-label">各尺寸预览(点击下载 PNG)</label>
    <div class="preview-row panel">
      <button v-for="p in previews" :key="p.size" class="preview" type="button" @click="downloadPng(p.size)">
        <span class="pv-box"><img :src="p.url" :width="Math.min(p.size, 64)" :height="Math.min(p.size, 64)" :alt="`${p.size} 像素预览`" /></span>
        <span class="pv-size">{{ p.size }}px</span>
      </button>
    </div>

    <details class="panel" style="margin-top: 16px">
      <summary>📖 用法提示</summary>
      <p class="tip">
        favicon.ico 放到网站根目录;现代浏览器与 PWA 清单建议同时提供 192/512 的 PNG(可在本工具的预览里直接下载)。
        .ico 文件内嵌的是 PNG 数据(Vista+ 标准),所有主流浏览器均支持。
      </p>
    </details>
  </template>
</template>

<style scoped>
.dropzone {
  border: 2px dashed var(--border);
  border-radius: var(--radius);
  padding: 38px 16px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.dropzone:hover {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.preview-row {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  padding: 16px;
}
.preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  border: none;
  background: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 10px;
}
.preview:hover {
  background: var(--accent-soft);
}
.pv-box {
  width: 64px;
  height: 64px;
  display: grid;
  place-items: center;
  background:
    linear-gradient(45deg, var(--bg-soft) 25%, transparent 25%, transparent 75%, var(--bg-soft) 75%),
    linear-gradient(45deg, var(--bg-soft) 25%, transparent 25%, transparent 75%, var(--bg-soft) 75%);
  background-size: 12px 12px;
  background-position: 0 0, 6px 6px;
  border-radius: 8px;
}
.pv-size {
  font-size: 12px;
  color: var(--muted);
  font-family: var(--mono);
}
</style>