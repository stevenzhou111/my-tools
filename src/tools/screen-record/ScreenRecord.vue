<script setup>
import { onUnmounted, ref } from 'vue'
import { downloadUrl } from '@/utils/image'

const recording = ref(false)
const paused = ref(false)
const elapsed = ref(0)
const error = ref('')
const resultUrl = ref('')
const resultSize = ref(0)
const resultDuration = ref(0)
const includeMic = ref(false)

let recorder = null
let stream = null
let timer = null
let chunks = []
let startedAt = 0

const supported =
  typeof navigator !== 'undefined' &&
  navigator.mediaDevices &&
  typeof navigator.mediaDevices.getDisplayMedia === 'function' &&
  typeof window.MediaRecorder === 'function'

async function start() {
  error.value = ''
  if (resultUrl.value) {
    URL.revokeObjectURL(resultUrl.value)
    resultUrl.value = ''
  }
  if (!supported) {
    error.value = '当前浏览器不支持屏幕录制(需要 Chrome / Edge,且页面通过 https 或 localhost 访问)'
    return
  }
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 30 },
      audio: includeMic.value,
    })
  } catch (e) {
    if (e.name !== 'NotAllowedError') error.value = '无法开始录屏:' + e.message
    return
  }
  // 用户点击浏览器自带的"停止共享"时结束录制
  stream.getVideoTracks()[0].addEventListener('ended', stop)
  const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((t) =>
    MediaRecorder.isTypeSupported(t),
  )
  try {
    const options = { videoBitsPerSecond: 5_000_000 }
    if (mimeType) options.mimeType = mimeType
    chunks = []
    recorder = new MediaRecorder(stream, options)
  } catch (e) {
    stream.getTracks().forEach((t) => t.stop())
    stream = null
    error.value = '当前浏览器不支持所选录制格式:' + e.message
    return
  }
  recorder.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data)
  }
  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: mimeType || 'video/webm' })
    resultSize.value = blob.size
    resultDuration.value = elapsed.value
    resultUrl.value = URL.createObjectURL(blob)
    stream?.getTracks().forEach((t) => t.stop())
    stream = null
  }
  recorder.start(1000)
  recording.value = true
  paused.value = false
  startedAt = Date.now()
  elapsed.value = 0
  timer = setInterval(() => {
    elapsed.value = (Date.now() - startedAt) / 1000
  }, 250)
}

function pauseResume() {
  if (!recorder) return
  if (paused.value) {
    recorder.resume()
    startedAt = Date.now() - elapsed.value * 1000
    timer = setInterval(() => {
      elapsed.value = (Date.now() - startedAt) / 1000
    }, 250)
    paused.value = false
  } else {
    recorder.pause()
    clearInterval(timer)
    paused.value = true
  }
}

function stop() {
  if (recorder && recorder.state !== 'inactive') recorder.stop()
  recording.value = false
  paused.value = false
  clearInterval(timer)
}

function download() {
  if (!resultUrl.value) return
  // resultUrl 由组件 onUnmounted 统一 revoke,这里只触发下载
  downloadUrl(resultUrl.value, `recording-${Date.now()}.webm`)
}

onUnmounted(() => {
  stop()
  if (resultUrl.value) URL.revokeObjectURL(resultUrl.value)
})
</script>

<template>
  <div v-if="error" class="error-box" style="margin-bottom: 14px">✗ {{ error }}</div>

  <div class="panel rec-panel">
    <div class="rec-status">
      <span class="dot" :class="{ on: recording, paused: paused }"></span>
      <template v-if="recording">
        {{ paused ? '已暂停' : '录制中' }} · {{ Math.floor(elapsed / 60) }}分{{ Math.floor(elapsed % 60) }}秒
      </template>
      <template v-else>准备就绪</template>
    </div>

    <div class="row" style="justify-content: center; margin-top: 18px">
      <button v-if="!recording" class="btn btn-primary rec-btn" @click="start">⏺ 开始录屏</button>
      <template v-else>
        <button class="btn" @click="pauseResume">{{ paused ? '▶ 继续' : '⏸ 暂停' }}</button>
        <button class="btn btn-danger-like" @click="stop">⏹ 停止录制</button>
      </template>
    </div>

    <div class="row" style="justify-content: center; margin-top: 14px">
      <label class="check"><input v-model="includeMic" type="checkbox" />同时录制麦克风(若浏览器提供该选项)</label>
    </div>
  </div>

  <div v-if="resultUrl" class="panel" style="margin-top: 14px">
    <label class="field-label">
      录制完成 · 时长 {{ Math.floor(resultDuration / 60) }}分{{ Math.floor(resultDuration % 60) }}秒 · 大小
      {{ (resultSize / 1024 / 1024).toFixed(1) }} MB
    </label>
    <video :src="resultUrl" class="player" controls></video>
    <div class="row" style="margin-top: 12px">
      <button class="btn btn-primary" @click="download">⬇️ 下载 WebM</button>
    </div>
  </div>

  <p class="tip" style="margin-top: 12px">
    点击开始后,浏览器会弹出共享选择器,可选择整个屏幕、单个窗口或浏览器标签页;录制内容全程只保存在本地。
  </p>
</template>

<style scoped>
.rec-panel {
  text-align: center;
  padding: 28px;
}
.rec-status {
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--muted);
}
.dot.on {
  background: #ef4444;
  animation: blink 1.2s infinite;
}
.dot.on.paused {
  animation: none;
}
@keyframes blink {
  50% { opacity: 0.3; }
}
.rec-btn {
  min-width: 140px;
}
.btn-danger-like {
  border-color: var(--danger);
  color: var(--danger);
}
.player {
  width: 100%;
  max-height: 420px;
  border-radius: 8px;
  background: #000;
}
</style>
