<script setup>
import { onUnmounted, ref } from 'vue'
import { framesToGifBlob } from '@/utils/gif'
import AppIcon from '@/components/AppIcon.vue'

const fileInput = ref(null)
const videoEl = ref(null)
const videoUrl = ref('')
const fileName = ref('')
const duration = ref(0)
const videoW = ref(0)
const videoH = ref(0)
const error = ref('')
const busy = ref(false)
const progress = ref(0)

// GIF 参数
const start = ref(0)
const end = ref(0)
const fps = ref(10)
const width = ref(360)
const resultUrl = ref('')
const resultSize = ref(0)
const resultFrames = ref(0)

const MAX_FRAMES = 240 // 防止内存失控
const MAX_WIDTH = 640

function pick() {
  fileInput.value?.click()
}

function onFileChange(e) {
  const f = e.target.files?.[0]
  if (!f) return
  loadFile(f)
  e.target.value = ''
}

function onDrop(e) {
  const f = e.dataTransfer?.files?.[0]
  if (f) loadFile(f)
}

function loadFile(f) {
  error.value = ''
  resetResult()
  if (!f.type.startsWith('video/')) {
    error.value = '请选择视频文件(MP4 / WebM / MOV 等)'
    return
  }
  fileName.value = f.name
  if (videoUrl.value) URL.revokeObjectURL(videoUrl.value)
  videoUrl.value = URL.createObjectURL(f)
}

function onLoadedMetadata() {
  const v = videoEl.value
  duration.value = v.duration
  videoW.value = v.videoWidth
  videoH.value = v.videoHeight
  // 默认取前 5 秒
  start.value = 0
  end.value = Math.min(5, Math.max(0.5, v.duration))
}

function resetResult() {
  if (resultUrl.value) URL.revokeObjectURL(resultUrl.value)
  resultUrl.value = ''
  resultSize.value = 0
  resultFrames.value = 0
  progress.value = 0
}

function clampRange() {
  const d = duration.value || 0
  start.value = Math.min(Math.max(0, start.value), Math.max(0, d - 0.1))
  end.value = Math.min(Math.max(start.value + 0.1, end.value), d)
}

/** 等视频 seek 到指定时刻(canvas drawImage 需要 seeked 事件保证帧就位) */
function seekTo(video, t) {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked)
      video.removeEventListener('error', onError)
      resolve()
    }
    const onError = () => {
      video.removeEventListener('seeked', onSeeked)
      video.removeEventListener('error', onError)
      reject(new Error('视频解码失败,请换 MP4/WebM 格式再试'))
    }
    video.addEventListener('seeked', onSeeked)
    video.addEventListener('error', onError)
    video.currentTime = t
  })
}

async function generate() {
  const video = videoEl.value
  if (!video || !video.videoWidth) return (error.value = '请先加载视频')
  clampRange()
  const span = end.value - start.value
  if (span <= 0) return (error.value = '结束时间需要晚于开始时间')

  const outW = Math.min(MAX_WIDTH, Math.max(80, Math.round(width.value)))
  // 高度保持视频比例并取偶数(编码器兼容性更好)
  const outH = Math.max(2, Math.round((outW * video.videoHeight) / video.videoWidth / 2) * 2)
  const interval = 1 / Math.max(1, fps.value)
  const count = Math.min(MAX_FRAMES, Math.floor(span * fps.value) + 1)
  if (span * fps.value + 1 > MAX_FRAMES) {
    error.value = `该区间约需 ${Math.round(span * fps.value) + 1} 帧,超出上限 ${MAX_FRAMES} 帧,请缩短区间或降低帧率`
    return
  }

  error.value = ''
  busy.value = true
  resetResult()

  try {
    const canvas = document.createElement('canvas')
    canvas.width = outW
    canvas.height = outH
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    const delay = Math.round(1000 / fps.value)
    const frames = []

    // 先 seek 到起点,再逐帧推进
    await seekTo(video, start.value)
    for (let i = 0; i < count; i++) {
      if (i > 0) await seekTo(video, start.value + i * interval)
      ctx.drawImage(video, 0, 0, outW, outH)
      const data = ctx.getImageData(0, 0, outW, outH)
      frames.push({ rgba: new Uint8Array(data.data), width: outW, height: outH, delay })
      progress.value = Math.round(((i + 1) / count) * 90)
    }

    const blob = await framesToGifBlob(frames)
    resultUrl.value = URL.createObjectURL(blob)
    resultSize.value = blob.size
    resultFrames.value = frames.length
    progress.value = 100
  } catch (e) {
    error.value = e?.message || '生成失败,请换一段视频再试'
  } finally {
    busy.value = false
  }
}

function download() {
  if (!resultUrl.value) return
  const a = document.createElement('a')
  a.href = resultUrl.value
  a.download = (fileName.value.replace(/\.[^.]+$/, '') || 'video') + '.gif'
  a.click()
}

onUnmounted(() => {
  if (videoUrl.value) URL.revokeObjectURL(videoUrl.value)
  if (resultUrl.value) URL.revokeObjectURL(resultUrl.value)
})
</script>

<template>
  <div
    class="dropzone"
    :class="{ 'has-video': videoUrl }"
    @click="pick"
    @dragover.prevent
    @drop.prevent="onDrop"
  >
    <input ref="fileInput" type="file" accept="video/*" class="sr-only" @change="onFileChange" />
    <template v-if="!videoUrl">
      <div class="dz-icon"><AppIcon name="film" :size="34" /></div>
      <p><strong>点击选择视频</strong> 或拖拽到此处</p>
      <p class="tip">MP4 / WebM / MOV 等,建议截取 2~10 秒片段,全程本地处理</p>
    </template>
    <p v-else class="tip m-0"><b>{{ fileName }}</b> · {{ videoW }}×{{ videoH }} · {{ duration.toFixed(1) }} 秒 · 点击可换一个视频</p>
  </div>

  <div v-if="error" class="error-box my-12">✗ {{ error }}</div>

  <div v-if="videoUrl" class="panel mt-14">
    <div class="preview-row">
      <video ref="videoEl" :src="videoUrl" class="preview-video" controls muted playsinline @loadedmetadata="onLoadedMetadata"></video>
      <div class="params">
        <div class="param-grid">
          <label class="param">
            <span>开始(秒)</span>
            <input v-model.number="start" class="input" type="number" min="0" step="0.1" :disabled="busy" />
          </label>
          <label class="param">
            <span>结束(秒)</span>
            <input v-model.number="end" class="input" type="number" min="0" step="0.1" :disabled="busy" />
          </label>
          <label class="param">
            <span>帧率(fps)</span>
            <input v-model.number="fps" class="input" type="number" min="1" max="30" :disabled="busy" />
          </label>
          <label class="param">
            <span>宽度(px,≤640)</span>
            <input v-model.number="width" class="input" type="number" min="80" max="640" :disabled="busy" />
          </label>
        </div>
        <div class="row range-row">
          <span class="tip">快捷区间:</span>
          <button class="btn btn-sm" :disabled="busy || duration < 3" @click="start = 0; end = Math.min(3, duration)">前 3 秒</button>
          <button class="btn btn-sm" :disabled="busy || duration < 5" @click="start = 0; end = Math.min(5, duration)">前 5 秒</button>
          <button class="btn btn-sm" :disabled="busy || duration < 10" @click="start = 0; end = Math.min(10, duration)">前 10 秒</button>
          <button class="btn btn-sm" :disabled="busy" @click="start = Math.max(0, duration / 2 - 2.5); end = Math.min(duration, duration / 2 + 2.5)">中间 5 秒</button>
        </div>
        <button class="btn btn-primary gen-btn" :disabled="busy" @click="generate">
          <template v-if="busy">采集中 {{ progress }}%…</template>
          <template v-else>生成 GIF</template>
        </button>
        <div v-if="busy" class="progress-track"><div class="progress-fill" :style="{ width: progress + '%' }"></div></div>
        <p class="tip m-0">
          预计 {{ Math.min(240, Math.floor((end - start) * fps) + 1) }} 帧 · 输出 {{ Math.min(640, width) }}×{{ videoH ? Math.round((Math.min(640, width) * videoH) / videoW / 2) * 2 : '?' }}
          · 帧率越高、区间越长,生成越慢、文件越大
        </p>
      </div>
    </div>
  </div>

  <div v-if="resultUrl" class="panel mt-16 result-panel">
    <div class="result-row">
      <img :src="resultUrl" class="result-img" alt="生成的 GIF 预览" />
      <div class="result-meta">
        <p class="m-0"><b>GIF 已生成</b></p>
        <p class="tip m-0">{{ resultFrames }} 帧 · {{ (resultSize / 1024).toFixed(0) }} KB</p>
        <button class="btn btn-primary" @click="download">下载 GIF</button>
      </div>
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
.dropzone.has-video {
  padding: 14px 20px;
}
.dz-icon {
  color: var(--muted);
  margin-bottom: 6px;
}
.dropzone p {
  margin: 4px 0;
}
.preview-row {
  display: flex;
  gap: 18px;
  flex-wrap: wrap;
}
.preview-video {
  width: 320px;
  max-width: 100%;
  border-radius: 10px;
  background: #000;
  flex-shrink: 0;
}
.params {
  flex: 1;
  min-width: 260px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.param-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.param {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13.5px;
  color: var(--muted);
}
.param .input {
  font-family: var(--mono);
}
.range-row {
  gap: 6px;
  flex-wrap: wrap;
}
.gen-btn {
  align-self: flex-start;
}
.progress-track {
  height: 8px;
  border-radius: 999px;
  background: var(--bg-soft);
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: var(--accent-grad);
  border-radius: 999px;
  transition: width 0.2s;
}
.result-panel {
  border-color: color-mix(in srgb, var(--accent) 40%, var(--border));
}
.result-row {
  display: flex;
  gap: 18px;
  align-items: center;
  flex-wrap: wrap;
}
.result-img {
  max-width: 320px;
  max-height: 320px;
  border-radius: 10px;
  background: var(--bg-soft);
}
.result-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}
</style>
