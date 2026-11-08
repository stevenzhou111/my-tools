<script setup>
import { ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { downloadBlob } from '@/utils/image'
import { formatSize } from '@/utils/format'
import { decodeAudio, encodeMp3 } from '@/utils/mp3Encode'

/**
 * 音频转 MP3:浏览器 AudioContext 解码常见格式(WAV/MP3/M4A/OGG/FLAC…),
 * lamejs 本机重编码为 MP3(可选码率)。全程本地,文件不上传。
 */

const KBPS = [128, 192, 256, 320]

const fileInput = ref(null)
const dragging = ref(false)
const error = ref('')
const file = ref(null)
const fileInfo = ref('')
const kbps = ref(192)
const busy = ref(false)
const progress = ref(0)
const result = ref(null) // { blob, url, mp3Size }
let objectUrl = ''

function pick() {
  fileInput.value?.click()
}
function onFileChange(e) {
  const f = e.target.files?.[0]
  if (f) load(f)
}
function onDrop(e) {
  dragging.value = false
  const f = e.dataTransfer?.files?.[0]
  if (f) load(f)
}

function load(f) {
  error.value = ''
  result.value = null
  file.value = f
  fileInfo.value = `${f.name} · ${formatSize(f.size)}`
}

async function convert() {
  if (!file.value || busy.value) return
  error.value = ''
  busy.value = true
  progress.value = 0
  try {
    const audio = await decodeAudio(file.value)
    const blob = await encodeMp3(audio, {
      kbps: kbps.value,
      onProgress: (p) => { progress.value = p },
    })
    if (objectUrl) URL.revokeObjectURL(objectUrl)
    objectUrl = URL.createObjectURL(blob)
    result.value = { blob, url: objectUrl, mp3Size: blob.size }
  } catch (e) {
    error.value = '转换失败:' + e.message
  } finally {
    busy.value = false
  }
}

function download() {
  const base = file.value.name.replace(/\.[^.]+$/, '')
  downloadBlob(result.value.blob, `${base}.mp3`)
}
</script>

<template>
  <div class="panel mb-16">
    <div
      class="dropzone"
      :class="{ dragging, 'has-file': file }"
      tabindex="0"
      @click="pick"
      @keydown.enter.prevent="pick"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop"
    >
      <input ref="fileInput" type="file" accept="audio/*" class="sr-only" @change="onFileChange" />
      <div class="dz-icon"><AppIcon name="audio-lines" :size="30" /></div>
      <p><strong>点击选择音频文件</strong>,拖拽到此处</p>
      <p class="tip">WAV / M4A / OGG / FLAC / MP3 等,浏览器能解码的都行;全程本机转换,不上传</p>
    </div>
    <p v-if="fileInfo" class="tip m-0 mt-8">已选择:{{ fileInfo }}</p>

    <div class="row mt-14 ctrl-row">
      <label class="ctrl">
        <span class="field-label">目标码率</span>
        <select v-model.number="kbps" class="select">
          <option v-for="k in KBPS" :key="k" :value="k">{{ k }} kbps</option>
        </select>
      </label>
      <button class="btn btn-primary" :disabled="!file || busy" @click="convert">
        <AppIcon name="audio-lines" :size="15" />{{ busy ? '转换中…' : '转换为 MP3' }}
      </button>
      <span v-if="busy" class="progress-wrap">
        <span class="progress-bar"><span class="progress-fill" :style="{ width: Math.round(progress * 100) + '%' }"></span></span>
        <span class="tip">{{ Math.round(progress * 100) }}%</span>
      </span>
    </div>
  </div>

  <div v-if="error" class="error-box mb-14">✗ {{ error }}</div>

  <div v-if="result" class="panel">
    <label class="field-label">转换完成 <span class="tip">{{ kbps }} kbps · {{ formatSize(result.mp3Size) }}</span></label>
    <audio :src="result.url" controls class="player"></audio>
    <div class="row mt-10">
      <button class="btn btn-sm btn-primary" @click="download"><AppIcon name="download" :size="14" />下载 .mp3</button>
      <span class="tip">原文件 {{ fileInfo }} → MP3 {{ formatSize(result.mp3Size) }}</span>
    </div>
  </div>
</template>

<style scoped>
.dropzone {
  border: 2px dashed var(--border);
  border-radius: var(--radius);
  padding: 36px 20px;
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
.ctrl-row {
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 14px;
}
.progress-wrap {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}
.progress-bar {
  flex: 1;
  max-width: 220px;
  height: 6px;
  border-radius: 3px;
  background: var(--border);
  overflow: hidden;
}
.progress-fill {
  display: block;
  height: 100%;
  background: var(--accent);
  transition: width 0.2s;
}
.player {
  width: 100%;
}
</style>
