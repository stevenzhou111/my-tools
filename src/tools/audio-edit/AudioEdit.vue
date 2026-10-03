<script setup>
import { computed, onUnmounted, ref } from 'vue'
import { downloadBlob } from '@/utils/image'

const fileInput = ref(null)
const fileName = ref('')
const buffer = ref(null) // AudioBuffer
const originalBuffer = ref(null)
const duration = ref(0)
const error = ref('')
const busy = ref(false)
const waveEl = ref(null)

const selStart = ref(0)
const selEnd = ref(0)
const volume = ref(100)
const reversed = ref(false)

const selectedDuration = computed(() => Math.max(0, selEnd.value - selStart.value))
const outputSize = computed(() =>
  buffer.value ? Math.round(selectedDuration.value * buffer.value.sampleRate) * buffer.value.numberOfChannels * 2 : 0,
)

function fmt(t) {
  const m = Math.floor(t / 60)
  const s = t - m * 60
  return `${String(m).padStart(2, '0')}:${s.toFixed(1).padStart(4, '0')}`
}

function pick() {
  fileInput.value?.click()
}

async function onFileChange(e) {
  const f = e.target.files?.[0]
  if (!f) return
  error.value = ''
  busy.value = true
  try {
    const arrayBuffer = await f.arrayBuffer()
    // 复用共享 AudioContext(Chrome 限制每页约 6 个,频繁新建会耗尽)
    const ctx = getAudioCtx()
    const decoded = await ctx.decodeAudioData(arrayBuffer)
    originalBuffer.value = decoded
    buffer.value = decoded
    duration.value = decoded.duration
    fileName.value = f.name
    selStart.value = 0
    selEnd.value = decoded.duration
    volume.value = 100
    reversed.value = false
    drawWave(decoded)
  } catch (err) {
    error.value = '无法解码该音频文件:' + err.message
  } finally {
    busy.value = false
  }
}

function drawWave(buf) {
  const canvas = waveEl.value
  if (!canvas) return
  const data = buf.getChannelData(0)
  const step = Math.max(1, Math.floor(data.length / canvas.width))
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#6366f1'
  ctx.fillStyle = accent
  for (let x = 0; x < canvas.width; x++) {
    let min = 1
    let max = -1
    for (let i = 0; i < step; i++) {
      const v = data[x * step + i] || 0
      if (v < min) min = v
      if (v > max) max = v
    }
    const y1 = ((1 - max) / 2) * canvas.height
    const y2 = ((1 - min) / 2) * canvas.height
    ctx.fillRect(x, y1, 1, Math.max(1, y2 - y1))
  }
}

let sharedCtx = null
function getAudioCtx() {
  if (!sharedCtx || sharedCtx.state === 'closed') sharedCtx = new AudioContext()
  if (sharedCtx.state === 'suspended') sharedCtx.resume()
  return sharedCtx
}

async function preview() {
  error.value = ''
  if (!buffer.value) return
  const out = await renderProcessed(buffer.value)
  const ctx = getAudioCtx()
  const src = ctx.createBufferSource()
  src.buffer = out
  src.connect(ctx.destination)
  src.start()
}

async function renderProcessed(input) {
  const sr = input.sampleRate
  const start = Math.floor(Math.min(selStart.value, selEnd.value) * sr)
  const end = Math.floor(Math.max(selStart.value, selEnd.value) * sr)
  const frames = Math.max(1, end - start)
  const channels = input.numberOfChannels
  const ctx = new OfflineAudioContext(channels, frames, sr)
  const src = ctx.createBufferSource()
  let data = input
  if (reversed.value) {
    const rev = new AudioBuffer({ length: input.length, numberOfChannels: channels, sampleRate: sr })
    for (let ch = 0; ch < channels; ch++) {
      const from = input.getChannelData(ch)
      const to = rev.getChannelData(ch)
      for (let i = 0, n = from.length; i < n; i++) to[i] = from[n - 1 - i]
    }
    data = rev
  }
  src.buffer = data
  const gain = ctx.createGain()
  gain.gain.value = volume.value / 100
  src.connect(gain).connect(ctx.destination)
  // 倒放时把源定位到区间结尾对应位置,截取 [length-end, length-start)
  src.start(0, reversed.value ? Math.max(0, data.duration - selEnd.value) : selStart.value, selectedDuration.value)
  return await ctx.startRendering()
}

function encodeWav(audioBuffer) {
  const channels = audioBuffer.numberOfChannels
  const sr = audioBuffer.sampleRate
  const frames = audioBuffer.length
  const bytes = 44 + frames * channels * 2
  const view = new DataView(new ArrayBuffer(bytes))
  const writeStr = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }
  writeStr(0, 'RIFF')
  view.setUint32(4, bytes - 8, true)
  writeStr(8, 'WAVEfmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, channels, true)
  view.setUint32(24, sr, true)
  view.setUint32(28, sr * channels * 2, true)
  view.setUint16(32, channels * 2, true)
  view.setUint16(34, 16, true)
  writeStr(36, 'data')
  view.setUint32(40, frames * channels * 2, true)
  let offset = 44
  const chData = []
  for (let ch = 0; ch < channels; ch++) chData.push(audioBuffer.getChannelData(ch))
  for (let i = 0; i < frames; i++) {
    for (let ch = 0; ch < channels; ch++) {
      const v = Math.max(-1, Math.min(1, chData[ch][i]))
      view.setInt16(offset, v < 0 ? v * 0x8000 : v * 0x7fff, true)
      offset += 2
    }
  }
  return new Blob([view], { type: 'audio/wav' })
}

async function exportWav() {
  error.value = ''
  if (!buffer.value) return
  busy.value = true
  try {
    const out = await renderProcessed(buffer.value)
    downloadBlob(encodeWav(out), fileName.value.replace(/\.[^.]+$/, '') + '-edited.wav')
  } catch (err) {
    error.value = '导出失败:' + err.message
  } finally {
    busy.value = false
  }
}

function resetAll() {
  buffer.value = originalBuffer.value
  selStart.value = 0
  selEnd.value = duration.value
  volume.value = 100
  reversed.value = false
}

onUnmounted(() => {
  if (sharedCtx && sharedCtx.state !== 'closed') sharedCtx.close()
  sharedCtx = null
})
</script>

<template>
  <div class="dropzone" @click="pick">
    <input ref="fileInput" type="file" accept="audio/*" hidden @change="onFileChange" />
    <div class="dz-icon">🎚️</div>
    <p><strong>点击选择音频文件</strong>(MP3 / WAV / M4A / OGG 等)</p>
    <p class="tip">裁剪片段、倒放、调音量,导出 WAV,全程本地处理</p>
  </div>

  <div v-if="error" class="error-box" style="margin-top: 12px">✗ {{ error }}</div>
  <div v-if="busy" class="tip" style="margin-top: 10px">解码中…</div>

  <template v-if="buffer">
    <div class="panel" style="margin-top: 14px">
      <canvas ref="waveEl" width="900" height="120" class="wave" role="img" aria-label="音频波形图,选择区间用下方滑块调整"></canvas>
      <div class="row" style="margin-top: 10px">
        <label class="ctrl-inline">
          起点 <strong>{{ fmt(selStart) }}</strong>
          <input v-model.number="selStart" type="range" min="0" :max="duration" step="0.05" />
        </label>
        <label class="ctrl-inline">
          终点 <strong>{{ fmt(selEnd) }}</strong>
          <input v-model.number="selEnd" type="range" min="0" :max="duration" step="0.05" />
        </label>
      </div>
      <div class="row" style="margin-top: 10px">
        <label class="ctrl-inline">音量 <strong>{{ volume }}%</strong>
          <input v-model.number="volume" type="range" min="0" max="300" step="10" />
        </label>
        <label class="check"><input v-model="reversed" type="checkbox" />倒放</label>
        <span class="tip">选中 {{ fmt(selectedDuration) }} · 导出约 {{ (outputSize / 1024 / 1024).toFixed(1) }} MB</span>
      </div>
      <div class="row" style="margin-top: 14px">
        <button class="btn" @click="preview">▶ 试听效果</button>
        <button class="btn btn-primary" @click="exportWav">⬇️ 导出 WAV</button>
        <button class="btn" @click="resetAll">↺ 恢复原始</button>
      </div>
    </div>
  </template>
</template>

<style scoped>
.dropzone {
  border: 2px dashed var(--border);
  border-radius: var(--radius);
  padding: 40px 20px;
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
.wave {
  width: 100%;
  height: 120px;
  background: var(--bg-soft);
  border-radius: 8px;
}
.ctrl-inline {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
}
.ctrl-inline input[type='range'] {
  width: 150px;
}
</style>
