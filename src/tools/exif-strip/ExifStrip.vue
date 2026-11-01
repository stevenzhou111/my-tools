<script setup>
import { onUnmounted, ref } from 'vue'
import exifr from 'exifr'

const fileInput = ref(null)
const sourceUrl = ref('')
const resultUrl = ref('')
const sourceFile = ref(null)
const sourceMeta = ref(null)
const resultMeta = ref(null)
const error = ref('')
const busy = ref(false)
const done = ref(false)

const format = ref('image/jpeg')
const quality = ref(0.9)

function pick() {
  fileInput.value?.click()
}

function onFileChange(e) {
  const f = e.target.files?.[0]
  if (!f) return
  load(f)
  e.target.value = ''
}

function onDrop(e) {
  const f = e.dataTransfer?.files?.[0]
  if (f) load(f)
}

async function load(f) {
  error.value = ''
  resetResult()
  if (!f.type.startsWith('image/')) {
    error.value = '请选择图片文件(JPG / PNG / WebP 等)'
    return
  }
  sourceFile.value = f
  if (sourceUrl.value) URL.revokeObjectURL(sourceUrl.value)
  sourceUrl.value = URL.createObjectURL(f)
  sourceMeta.value = await readMeta(f)
}

async function readMeta(blob) {
  try {
    const parsed = await exifr.parse(blob, true)
    if (!parsed) return { count: 0, hasGps: false, camera: '', tags: [] }
    const keys = Object.keys(parsed).filter((k) => k !== 'ifd0' && k !== 'exif' && k !== 'gps')
    const tags = keys.filter((k) => typeof parsed[k] !== 'object').slice(0, 40)
    return {
      count: keys.length,
      hasGps: Boolean(parsed.latitude || parsed.GPSLatitude || parsed.longitude),
      camera: [parsed.Make, parsed.Model].filter(Boolean).join(' '),
      takenAt: parsed.DateTimeOriginal || parsed.CreateDate || '',
      tags,
    }
  } catch {
    // PNG 等大多无 EXIF,解析失败当作无元信息
    return { count: 0, hasGps: false, camera: '', takenAt: '', tags: [] }
  }
}

function resetResult() {
  if (resultUrl.value) URL.revokeObjectURL(resultUrl.value)
  resultUrl.value = ''
  resultMeta.value = null
  done.value = false
}

async function clean() {
  const img = new Image()
  if (!sourceUrl.value) return
  busy.value = true
  try {
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = () => reject(new Error('图片解码失败'))
      img.src = sourceUrl.value
    })
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    // JPG 无透明通道:先铺白底避免透明区域变黑
    if (format.value === 'image/jpeg') {
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
    // 关键一步:重绘到全新画布再编码,EXIF/GPS 等元信息不会跟随像素
    ctx.drawImage(img, 0, 0)
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('编码失败'))), format.value, quality.value)
    })
    if (resultUrl.value) URL.revokeObjectURL(resultUrl.value)
    resultUrl.value = URL.createObjectURL(blob)
    resultMeta.value = { meta: await readMeta(blob), size: blob.size }
    done.value = true
  } catch (e) {
    error.value = e?.message || '清理失败,请换一张图片再试'
  } finally {
    busy.value = false
  }
}

function download() {
  if (!resultUrl.value) return
  const ext = format.value === 'image/jpeg' ? 'jpg' : format.value === 'image/webp' ? 'webp' : 'png'
  const a = document.createElement('a')
  a.href = resultUrl.value
  a.download = `cleaned-${Date.now()}.${ext}`
  a.click()
}

onUnmounted(() => {
  if (sourceUrl.value) URL.revokeObjectURL(sourceUrl.value)
  if (resultUrl.value) URL.revokeObjectURL(resultUrl.value)
})
</script>

<template>
  <div
    class="dropzone"
    :class="{ 'has-file': sourceUrl }"
    @click="pick"
    @dragover.prevent
    @drop.prevent="onDrop"
  >
    <input ref="fileInput" type="file" accept="image/*" class="sr-only" @change="onFileChange" />
    <template v-if="!sourceUrl">
      <p><strong>点击选择图片</strong> 或拖拽到此处</p>
      <p class="tip">拍照原图常带 GPS 位置与设备信息,分享前先清理;全程本地处理</p>
    </template>
    <p v-else class="tip m-0"><b>{{ sourceFile.name }}</b> · {{ (sourceFile.size / 1024).toFixed(0) }} KB · 点击可换一张</p>
  </div>

  <div v-if="error" class="error-box my-12">✗ {{ error }}</div>

  <div v-if="sourceMeta" class="panel mt-14">
    <p class="m-0 mb-10"><b>原图元信息检查</b></p>
    <div v-if="sourceMeta.count === 0" class="ok-line">✓ 这张图没有可读的 EXIF 元信息(可能已被清理或本身不含),可以放心分享。</div>
    <template v-else>
      <div class="meta-row warn-color">
        检测到 <b>{{ sourceMeta.count }}</b> 项元信息
        <span v-if="sourceMeta.hasGps" class="gps-tag">⚠ 含 GPS 位置</span>
      </div>
      <p v-if="sourceMeta.camera || sourceMeta.takenAt" class="tip m-0 mt-8">
        {{ sourceMeta.camera }}{{ sourceMeta.takenAt ? ` · 拍摄于 ${new Date(sourceMeta.takenAt).toLocaleString('zh-CN')}` : '' }}
      </p>
      <details class="mt-8">
        <summary class="tip">查看全部字段</summary>
        <code class="tag-list">{{ sourceMeta.tags.join(' · ') }}</code>
      </details>
    </template>
  </div>

  <div v-if="sourceUrl && sourceMeta" class="panel mt-14">
    <div class="row">
      <label class="ctrl">
        <span class="field-label m-0">输出格式</span>
        <select v-model="format" class="select">
          <option value="image/jpeg">JPG(体积小,无透明)</option>
          <option value="image/webp">WebP(现代格式)</option>
          <option value="image/png">PNG(无损)</option>
        </select>
      </label>
      <label v-if="format !== 'image/png'" class="ctrl">
        <span class="field-label m-0">质量 {{ Math.round(quality * 100) }}%</span>
        <input v-model.number="quality" type="range" min="0.5" max="1" step="0.05" />
      </label>
      <button class="btn btn-primary self-end" :disabled="busy" @click="clean">
        {{ busy ? '清理中…' : '重绘去除元信息' }}
      </button>
    </div>
    <p class="tip m-0 mt-8">原理:把像素重绘到全新画布再重新编码——EXIF/GPS 等元数据不会跟随像素迁移,画面内容保持不变。</p>
  </div>

  <div v-if="done && resultMeta" class="panel mt-14 result-panel">
    <div class="result-row">
      <div class="result-meta">
        <p class="m-0"><b>清理完成</b></p>
        <div class="ok-line">✓ 重新检查:{{ resultMeta.meta.count }} 项元信息{{ resultMeta.meta.hasGps ? '(仍有 GPS?)' : ',无 GPS 位置' }}</div>
        <p class="tip m-0">
          {{ (sourceFile.size / 1024).toFixed(0) }} KB → {{ (resultMeta.size / 1024).toFixed(0) }} KB
        </p>
        <button class="btn btn-primary" @click="download">下载清理后的图片</button>
      </div>
      <img :src="resultUrl" class="result-img" alt="清理后的图片预览" />
    </div>
    <details class="mt-8">
      <summary class="tip">与原图对比(应完全一致)</summary>
      <div class="compare-row">
        <img :src="sourceUrl" class="result-img" alt="原图" />
      </div>
    </details>
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
.dropzone.has-file {
  padding: 14px 20px;
}
.dropzone p {
  margin: 4px 0;
}
.ctrl {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.self-end {
  align-self: flex-end;
}
.meta-row {
  font-size: 15px;
}
.warn-color {
  color: var(--warning);
}
.gps-tag {
  display: inline-block;
  margin-left: 10px;
  font-size: 12.5px;
  padding: 2px 10px;
  border-radius: 999px;
  background: var(--danger-soft);
  color: var(--danger);
  font-weight: 600;
}
.ok-line {
  color: var(--success);
  font-size: 14.5px;
}
.tag-list {
  display: block;
  margin-top: 6px;
  font-family: var(--mono);
  font-size: 12.5px;
  color: var(--muted);
  word-break: break-all;
  line-height: 1.8;
}
.result-panel {
  border-color: color-mix(in srgb, var(--success) 40%, var(--border));
}
.result-row {
  display: flex;
  gap: 18px;
  align-items: flex-start;
  flex-wrap: wrap;
}
.result-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}
.result-img {
  max-width: 300px;
  max-height: 300px;
  border-radius: 10px;
  background: var(--bg-soft);
}
.compare-row {
  margin-top: 8px;
}
</style>
