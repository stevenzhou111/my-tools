<script setup>
import { onUnmounted, ref } from 'vue'
import { encodeWav } from '@/utils/wav'
import AppIcon from '@/components/AppIcon.vue'

const fileInput = ref(null)
const videoEl = ref(null)
const videoUrl = ref('')
const fileName = ref('')
const duration = ref(0)
const videoW = ref(0)
const error = ref('')
const busy = ref(false)
const resultUrl = ref('')
const resultSize = ref(0)
const audioInfo = ref(null) // { channels, sampleRate, seconds }

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

function load(f) {
  error.value = ''
  if (resultUrl.value) {
    URL.revokeObjectURL(resultUrl.value)
    resultUrl.value = ''
  }
  audioInfo.value = null
  if (!f.type.startsWith('video/')) {
    error.value = '请选择视频文件(MP4 / WebM / MOV 等)'
    return
  }
  fileName.value = f.name
  if (videoUrl.value) URL.revokeObjectURL(videoUrl.value)
  videoUrl.value = URL.createObjectURL(f)
}

function onLoadedMetadata() {
  duration.value = videoEl.value.duration
  videoW.value = videoEl.value.videoWidth
}

async function extract() {
  if (!videoUrl.value) return
  busy.value = true
  error.value = ''
  try {
    // 视频文件的字节流直接丢给 WebAudio 解码:有音轨就得到 AudioBuffer,无声轨会抛错
    const buf = await (await fetch(videoUrl.value)).arrayBuffer()
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    try {
      const audio = await ctx.decodeAudioData(buf)
      const blob = encodeWav(audio)
      if (resultUrl.value) URL.revokeObjectURL(resultUrl.value)
      resultUrl.value = URL.createObjectURL(blob)
      resultSize.value = blob.size
      audioInfo.value = {
        channels: audio.numberOfChannels,
        sampleRate: audio.sampleRate,
        seconds: audio.duration,
      }
    } finally {
      ctx.close().catch(() => {})
    }
  } catch {
    error.value = '解码音频失败:这段视频可能没有音轨,或使用了浏览器不支持的音频编码(如 AC-3/DTS)。'
  } finally {
    busy.value = false
  }
}

function download() {
  if (!resultUrl.value) return
  const a = document.createElement('a')
  a.href = resultUrl.value
  a.download = (fileName.value.replace(/\.[^.]+$/, '') || 'audio') + '.wav'
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
      <div class="dz-icon"><AppIcon name="music-2" :size="34" /></div>
      <p><strong>点击选择视频</strong> 或拖拽到此处</p>
      <p class="tip">提取其中的声音为 WAV,全程本地处理;有音轨的 MP4 / WebM / MOV 均可</p>
    </template>
    <p v-else class="tip m-0"><b>{{ fileName }}</b> · {{ duration.toFixed(1) }} 秒 · 点击可换一个视频</p>
  </div>

  <div v-if="error" class="error-box my-12">✗ {{ error }}</div>

  <div v-if="videoUrl" class="panel mt-14">
    <video ref="videoEl" :src="videoUrl" controls muted playsinline class="preview-video" @loadedmetadata="onLoadedMetadata"></video>
    <div class="row mt-12">
      <button class="btn btn-primary" :disabled="busy" @click="extract">
        {{ busy ? '解码中…' : '提取音频' }}
      </button>
      <span class="tip">WAV 为无损 PCM,体积较大({{ Math.round((duration || 0) * 176) }} KB/秒左右);需要压缩可交给「音频剪辑」再处理。</span>
    </div>
  </div>

  <div v-if="resultUrl" class="panel mt-14 result-panel">
    <p class="m-0 mb-8">
      <b>音频已提取</b> · {{ audioInfo ? `${audioInfo.channels === 1 ? '单声道' : '双声道'} ${audioInfo.sampleRate} Hz · ${audioInfo.seconds.toFixed(1)} 秒` : '' }}
      · {{ (resultSize / 1024 / 1024).toFixed(1) }} MB
    </p>
    <audio :src="resultUrl" controls class="result-audio"></audio>
    <div class="row mt-10">
      <button class="btn btn-primary" @click="download">下载 WAV</button>
      <router-link to="/tool/audio-edit" class="btn">继续剪辑 →</router-link>
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
.dropzone p {
  margin: 4px 0;
}
.dz-icon {
  color: var(--muted);
  margin-bottom: 6px;
  display: grid;
  place-items: center;
}
.preview-video {
  width: 340px;
  max-width: 100%;
  border-radius: 10px;
  background: #000;
}
.result-panel {
  border-color: color-mix(in srgb, var(--accent) 40%, var(--border));
}
.result-audio {
  width: 100%;
}
</style>
