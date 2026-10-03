<script setup>
import { onUnmounted, ref } from 'vue'
import { downloadCanvas } from '@/utils/image'

const fileInput = ref(null)
const videoEl = ref(null)
const videoUrl = ref('')
const fileName = ref('')
const duration = ref(0)
const currentTime = ref(0)
const error = ref('')
const shots = ref([]) // { url, time, w, h }

function clearShots() {
  shots.value.forEach((s) => URL.revokeObjectURL(s.url))
  shots.value = []
}

function pick() {
  fileInput.value?.click()
}
function onFileChange(e) {
  const f = e.target.files?.[0]
  if (!f) return
  error.value = ''
  clearShots()
  if (videoUrl.value) URL.revokeObjectURL(videoUrl.value)
  if (!f.type.startsWith('video/')) return (error.value = '请选择视频文件')
  fileName.value = f.name
  videoUrl.value = URL.createObjectURL(f)
}

onUnmounted(() => {
  clearShots()
  if (videoUrl.value) URL.revokeObjectURL(videoUrl.value)
})

function onLoadedMetadata() {
  duration.value = videoEl.value.duration
}

function onTimeUpdate() {
  currentTime.value = videoEl.value.currentTime
}

function seek() {
  const t = Number(prompt(`跳转到第几秒?(0 ~ ${duration.value.toFixed(1)})`, currentTime.value.toFixed(1)))
  if (!Number.isNaN(t) && t >= 0 && t <= duration.value) {
    videoEl.value.currentTime = t
  }
}

function capture() {
  const video = videoEl.value
  if (!video || !video.videoWidth) return (error.value = '请先加载视频')
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  canvas.getContext('2d').drawImage(video, 0, 0)
  canvas.toBlob((blob) => {
    if (!blob) return
    shots.value.unshift({
      url: URL.createObjectURL(blob),
      blob,
      time: currentTime.value,
      w: video.videoWidth,
      h: video.videoHeight,
      canvas,
    })
  }, 'image/png')
}

function downloadShot(shot) {
  downloadCanvas(shot.canvas, `${fileName.value.replace(/\.[^.]+$/, '')}-${shot.time.toFixed(2)}s.png`, 'image/png')
}

function fmt(t) {
  const m = Math.floor(t / 60)
  const s = Math.floor(t) % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${Math.floor((t % 1) * 10)}`
}
</script>

<template>
  <div class="dropzone" @click="pick">
    <input ref="fileInput" type="file" accept="video/*" hidden @change="onFileChange" />
    <div class="dz-icon">📸</div>
    <p><strong>点击选择本地视频</strong>(MP4 / WebM / MOV 等)</p>
    <p class="tip">播放或拖动进度条到想要的位置,点击「截取当前帧」保存画面</p>
  </div>

  <div v-if="error" class="error-box" style="margin-top: 12px">✗ {{ error }}</div>

  <template v-if="videoUrl">
    <div class="panel" style="margin-top: 14px">
      <video
        ref="videoEl"
        :src="videoUrl"
        class="player"
        controls
        playsinline
        @loadedmetadata="onLoadedMetadata"
        @timeupdate="onTimeUpdate"
      ></video>
      <div class="row" style="margin-top: 12px">
        <span class="tip">时间 {{ fmt(currentTime) }} / {{ fmt(duration) }} · 原始分辨率 {{ videoEl?.videoWidth }}×{{ videoEl?.videoHeight }}</span>
        <button class="btn" @click="seek">⏱ 跳转到指定时间</button>
        <button class="btn btn-primary" @click="capture">📸 截取当前帧</button>
      </div>
    </div>

    <div v-if="shots.length" class="panel" style="margin-top: 14px">
      <label class="field-label">已截取 {{ shots.length }} 帧(点击下载)</label>
      <div class="shot-grid">
        <div v-for="(s, i) in shots" :key="i" class="shot">
          <img :src="s.url" :alt="'帧 ' + i" />
          <div class="shot-meta">
            <span class="tip">{{ fmt(s.time) }}</span>
            <button class="btn btn-sm" @click="downloadShot(s)">⬇️ PNG</button>
          </div>
        </div>
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
.player {
  width: 100%;
  max-height: 420px;
  border-radius: 8px;
  background: #000;
}
.shot-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}
.shot img {
  width: 100%;
  border-radius: 8px;
  border: 1px solid var(--border);
}
.shot-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
}
</style>
