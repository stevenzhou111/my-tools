<script setup>
import { onUnmounted, ref } from 'vue'

const active = ref(false)
const starting = ref(false)
const error = ref('')
const videoEl = ref(null)
const stream = ref(null)
const devices = ref([])
const videoInfo = ref(null)
const micLevel = ref(0)

let audioCtx = null
let levelTimer = 0

async function listDevices() {
  try {
    const all = await navigator.mediaDevices.enumerateDevices()
    devices.value = all.map((d, i) => ({
      ...d,
      label: d.label || `${d.kind === 'videoinput' ? '摄像头' : d.kind === 'audioinput' ? '麦克风' : '扬声器'} ${i + 1}`,
    }))
  } catch {
    devices.value = []
  }
}

async function start() {
  error.value = ''
  if (!navigator.mediaDevices?.getUserMedia) {
    error.value = '当前浏览器不支持摄像头/麦克风访问(需要 https 或 localhost 环境)'
    return
  }
  starting.value = true
  try {
    const s = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 } }, audio: true })
    stream.value = s
    active.value = true
    await listDevices()
    if (videoEl.value) {
      videoEl.value.srcObject = s
      await videoEl.value.play().catch(() => {})
    }
    const track = s.getVideoTracks()[0]
    const settings = track?.getSettings?.()
    videoInfo.value = settings
      ? { width: settings.width, height: settings.height, frameRate: Math.round(settings.frameRate ?? 0), label: track.label }
      : null
    watchMic(s)
  } catch (e) {
    if (e.name === 'NotAllowedError') error.value = '权限被拒绝:请在浏览器地址栏的权限设置里允许摄像头和麦克风,然后重试。'
    else if (e.name === 'NotFoundError') error.value = '没有检测到可用的摄像头或麦克风设备。'
    else if (e.name === 'NotReadableError') error.value = '设备被其他应用占用中(如其他会议软件),关闭后重试。'
    else error.value = `启动失败:${e.message || e.name}`
  } finally {
    starting.value = false
  }
}

// 麦克风电平表:AnalyserNode 取时域峰值,采样 150ms 足够流畅且省电
function watchMic(s) {
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    const src = audioCtx.createMediaStreamSource(s)
    const analyser = audioCtx.createAnalyser()
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
      micLevel.value = Math.min(100, Math.round((peak / 128) * 100))
    }, 150)
  } catch {
    micLevel.value = -1
  }
}

async function stop() {
  stream.value?.getTracks().forEach((t) => t.stop())
  stream.value = null
  if (videoEl.value) videoEl.value.srcObject = null
  active.value = false
  videoInfo.value = null
  clearInterval(levelTimer)
  if (audioCtx) {
    await audioCtx.close().catch(() => {})
    audioCtx = null
  }
  micLevel.value = 0
  listDevices()
}

onUnmounted(() => {
  if (active.value) stop()
})
</script>

<template>
  <p class="tip" style="margin-bottom: 14px">
    开会前先试试摄像头和麦克风是否正常:画面、清晰度(实际分辨率 / 帧率)与收音电平全部本地显示,任何画面与声音都不会被录制或上传。
  </p>

  <div v-if="error" class="error-box" style="margin-bottom: 14px">✗ {{ error }}</div>

  <div v-if="!active" class="panel cam-empty">
    <div style="font-size: 44px">📷</div>
    <p><strong>{{ starting ? '正在启动…' : '摄像头未开启' }}</strong></p>
    <p class="tip">点击下方按钮并在浏览器弹窗中允许权限</p>
    <button class="btn btn-primary" style="margin-top: 14px" :disabled="starting" @click="start">
      {{ starting ? '启动中…' : '▶ 开启摄像头与麦克风' }}
    </button>
  </div>

  <template v-else>
    <div class="cam-wrap">
      <video ref="videoEl" class="cam-video" playsinline muted></video>
      <div v-if="videoInfo" class="cam-badge">
        {{ videoInfo.width }}×{{ videoInfo.height }} · {{ videoInfo.frameRate }} FPS
      </div>
    </div>

    <div class="panel" style="margin-top: 14px">
      <div class="row" style="justify-content: space-between">
        <span class="field-label" style="margin: 0">🎤 麦克风电平(对着说话应明显起伏)</span>
        <span class="tip">{{ micLevel < 0 ? '不支持电平检测' : micLevel > 4 ? '有声音' : '安静' }}</span>
      </div>
      <div class="level-track" aria-hidden="true">
        <div class="level-fill" :style="{ width: Math.max(0, micLevel) + '%' }" />
      </div>
    </div>

    <div class="row" style="margin-top: 14px">
      <button class="btn btn-primary" @click="stop">⏹ 关闭设备</button>
      <button class="btn" @click="listDevices">↺ 刷新设备列表</button>
    </div>
  </template>

  <div v-if="devices.length" class="panel" style="margin-top: 14px">
    <span class="field-label">检测到的设备({{ devices.length }})</span>
    <div class="dev-list">
      <div v-for="(d, i) in devices" :key="d.deviceId + '-' + i" class="dev-row">
        <span class="dev-kind">{{ d.kind === 'videoinput' ? '📷 摄像头' : d.kind === 'audioinput' ? '🎤 麦克风' : '🔊 扬声器' }}</span>
        <span class="dev-label">{{ d.label }}</span>
      </div>
    </div>
    <p v-if="devices.some((d) => !d.deviceId)" class="tip" style="margin-top: 8px">
      部分设备还没有授权,名称与 ID 需要开启摄像头后才能完整显示。
    </p>
  </div>
</template>

<style scoped>
.cam-empty {
  text-align: center;
  padding: 46px 18px;
}
.cam-wrap {
  position: relative;
  background: #000;
  border-radius: var(--radius);
  overflow: hidden;
}
.cam-video {
  display: block;
  width: 100%;
  max-height: 420px;
  object-fit: contain;
  transform: scaleX(-1);
}
.cam-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-family: var(--mono);
  font-size: 12.5px;
  padding: 3px 10px;
  border-radius: 999px;
}
.level-track {
  height: 10px;
  border-radius: 5px;
  background: var(--bg-soft);
  border: 1px solid var(--border);
  margin-top: 10px;
  overflow: hidden;
}
.level-fill {
  height: 100%;
  background: var(--accent-grad);
  transition: width 0.12s linear;
}
.dev-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.dev-row {
  display: flex;
  gap: 10px;
  font-size: 14.5px;
  padding: 5px 0;
  border-bottom: 1px solid var(--border);
}
.dev-row:last-child {
  border-bottom: none;
}
.dev-kind {
  flex-shrink: 0;
  width: 90px;
  color: var(--muted);
}
.dev-label {
  word-break: break-all;
}
</style>
