<script setup>
import { onUnmounted, ref } from 'vue'

const active = ref(false)
const paused = ref(false)
const starting = ref(false)
const error = ref('')
const level = ref(0)
const elapsed = ref(0)
const devices = ref([])
const resultUrl = ref('')
const resultSize = ref(0)
const mimeType = ref('')
const previewEl = ref(null)

let stream = null
let recorder = null
let audioCtx = null
let analyser = null
let levelTimer = 0
let timeTimer = 0
let chunks = []
let disposed = false

function fmtTime(s) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

async function listDevices() {
  try {
    const all = await navigator.mediaDevices.enumerateDevices()
    devices.value = all.filter((d) => d.kind === 'audioinput').map((d, i) => ({ ...d, label: d.label || `麦克风 ${i + 1}` }))
  } catch {
    devices.value = []
  }
}

async function start() {
  error.value = ''
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    error.value = '当前浏览器不支持录音(需要 https 或 localhost 环境)'
    return
  }
  starting.value = true
  try {
    // 关闭降噪/回声处理:录音乐素材与会议记录都希望保留原始声音
    const s = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    })
    if (disposed) {
      s.getTracks().forEach((t) => t.stop())
      return
    }
    stream = s
    active.value = true
    await listDevices()

    chunks = []
    const preferred = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
    mimeType.value = preferred.find((t) => MediaRecorder.isTypeSupported?.(t)) || ''
    recorder = new MediaRecorder(s, mimeType.value ? { mimeType: mimeType.value } : undefined)
    mimeType.value = recorder.mimeType || mimeType.value || 'audio/webm'
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: recorder.mimeType || mimeType.value })
      if (resultUrl.value) URL.revokeObjectURL(resultUrl.value)
      resultUrl.value = URL.createObjectURL(blob)
      resultSize.value = blob.size
    }
    recorder.start(500) // 定期吐数据,进程被杀也能保住已录部分

    watchLevel(s)
    const startedAt = Date.now() - elapsed.value * 1000
    timeTimer = setInterval(() => {
      elapsed.value = (Date.now() - startedAt) / 1000
    }, 200)
  } catch (e) {
    if (e.name === 'NotAllowedError') error.value = '权限被拒绝:请在浏览器地址栏的权限设置里允许麦克风,然后重试。'
    else if (e.name === 'NotFoundError') error.value = '没有检测到可用的麦克风设备。'
    else if (e.name === 'NotReadableError') error.value = '麦克风被其他应用占用中,关闭后重试。'
    else error.value = `启动失败:${e.message || e.name}`
  } finally {
    starting.value = false
  }
}

function watchLevel(s) {
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    const src = audioCtx.createMediaStreamSource(s)
    analyser = audioCtx.createAnalyser()
    analyser.fftSize = 1024
    src.connect(analyser)
    const buf = new Uint8Array(analyser.fftSize)
    levelTimer = setInterval(() => {
      analyser.getByteTimeDomainData(buf)
      let peak = 0
      for (let i = 0; i < buf.length; i++) {
        const v = Math.abs(buf[i] - 128)
        if (v > peak) peak = v
      }
      level.value = Math.min(100, Math.round((peak / 128) * 100))
    }, 120)
  } catch {
    /* 电平表失败不影响录音 */
  }
}

function togglePause() {
  if (!recorder) return
  if (recorder.state === 'recording') {
    recorder.pause()
    paused.value = true
    clearInterval(timeTimer)
    clearInterval(levelTimer)
    level.value = 0
  } else if (recorder.state === 'paused') {
    recorder.resume()
    paused.value = false
    watchLevel(stream)
    const startedAt = Date.now() - elapsed.value * 1000
    timeTimer = setInterval(() => {
      elapsed.value = (Date.now() - startedAt) / 1000
    }, 200)
  }
}

function stop() {
  if (!recorder) return
  recorder.stop()
  active.value = false
  paused.value = false
  clearInterval(levelTimer)
  clearInterval(timeTimer)
  level.value = 0
  stream?.getTracks().forEach((t) => t.stop())
  stream = null
  audioCtx?.close().catch(() => {})
  audioCtx = null
}

function download() {
  if (!resultUrl.value) return
  const ext = mimeType.value.includes('mp4') ? 'm4a' : mimeType.value.includes('ogg') ? 'ogg' : 'webm'
  const a = document.createElement('a')
  a.href = resultUrl.value
  a.download = `recording-${new Date().toISOString().slice(0, 19).replaceAll(':', '-')}.${ext}`
  a.click()
}

onUnmounted(() => {
  disposed = true
  if (recorder && recorder.state !== 'inactive') recorder.stop()
  clearInterval(levelTimer)
  clearInterval(timeTimer)
  stream?.getTracks().forEach((t) => t.stop())
  audioCtx?.close().catch(() => {})
  if (resultUrl.value) URL.revokeObjectURL(resultUrl.value)
})
</script>

<template>
  <div class="panel mb-16 rec-panel">
    <div class="rec-main">
      <div class="rec-indicator" :class="{ live: active && !paused }">
        <span class="rec-dot"></span>
        <span class="rec-state">{{ active ? (paused ? '已暂停' : '录音中') : '待开始' }}</span>
      </div>
      <div class="rec-time">{{ fmtTime(elapsed) }}</div>
      <div class="level-track" role="img" :aria-label="`输入电平 ${level}%`">
        <div class="level-fill" :style="{ width: level + '%' }"></div>
      </div>
    </div>
    <div class="row rec-btns">
      <button v-if="!active" class="btn btn-primary" :disabled="starting" @click="start">
        {{ starting ? '请求权限中…' : '开始录音' }}
      </button>
      <template v-else>
        <button class="btn" @click="togglePause">{{ paused ? '继续' : '暂停' }}</button>
        <button class="btn btn-primary" @click="stop">停止并保存</button>
      </template>
    </div>
    <p class="tip m-0">
      声音仅在本页录制与播放,不会上传;关闭页面录音即结束。
      {{ devices.length ? `当前设备:${devices[0].label}` : '' }}
    </p>
  </div>

  <div v-if="error" class="error-box mb-14">✗ {{ error }}</div>

  <div v-if="resultUrl" class="panel result-panel">
    <p class="m-0 mb-10"><b>录音完成</b> · {{ fmtTime(elapsed) }} · {{ (resultSize / 1024).toFixed(0) }} KB · {{ mimeType }}</p>
    <audio ref="previewEl" :src="resultUrl" controls class="result-audio"></audio>
    <div class="row mt-10">
      <button class="btn btn-primary" @click="download">下载录音</button>
      <button class="btn" @click="resultUrl = ''; elapsed = 0">清掉重录</button>
    </div>
    <p class="tip m-0 mt-8">
      输出为浏览器原生的录音容器(Chrome/Edge 是 WebM/Opus,Safari 是 MP4/AAC),可直接插入文档或再交给「音频剪辑」裁剪。
    </p>
  </div>
</template>

<style scoped>
.rec-panel {
  text-align: center;
  padding: 30px 20px;
}
.rec-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}
.rec-indicator {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--muted);
}
.rec-indicator.live {
  color: var(--danger);
}
.rec-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--muted);
}
.rec-indicator.live .rec-dot {
  background: var(--danger);
  animation: blink 1.1s ease-in-out infinite;
}
@keyframes blink {
  50% { opacity: 0.25; }
}
.rec-time {
  font-family: var(--mono);
  font-size: 44px;
  font-weight: 700;
  letter-spacing: 2px;
}
.level-track {
  width: min(420px, 90%);
  height: 10px;
  border-radius: 999px;
  background: var(--bg-soft);
  overflow: hidden;
}
.level-fill {
  height: 100%;
  background: var(--accent-grad);
  border-radius: 999px;
  transition: width 0.12s linear;
}
.rec-btns {
  justify-content: center;
  margin-top: 6px;
}
.result-panel {
  border-color: color-mix(in srgb, var(--accent) 40%, var(--border));
}
.result-audio {
  width: 100%;
}
</style>
