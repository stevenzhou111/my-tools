<script setup>
import AppIcon from '@/components/AppIcon.vue'
import { computed, onUnmounted, ref } from 'vue'
import { mergeDuration, mergeTracks, trackChannels } from '@/utils/audioJoin'
import { formatSize } from '@/utils/format'
import { downloadBlob } from '@/utils/image'
import { decodeAudio } from '@/utils/mp3Encode'
import { encodeWav } from '@/utils/wav'

const fileInput = ref(null)
const dragging = ref(false)
const items = ref([])
const busy = ref(false)
const error = ref('')
const gap = ref(0.5)
const fade = ref(true)
const result = ref(null)

let seq = 0

const canMerge = computed(() => items.value.length >= 2 && !busy.value)
const totalDuration = computed(() => items.value.reduce((s, it) => s + it.duration, 0))

function fmt(t) {
  const m = Math.floor(t / 60)
  const s = t - m * 60
  return `${String(m).padStart(2, '0')}:${s.toFixed(1).padStart(4, '0')}`
}

function pick() {
  fileInput.value?.click()
}

function onFileChange(e) {
  const list = [...(e.target.files || [])]
  e.target.value = ''
  if (list.length) addFiles(list)
}

function onDrop(e) {
  dragging.value = false
  const list = [...(e.dataTransfer?.files || [])]
  if (list.length) addFiles(list)
}

async function addFiles(files) {
  if (busy.value) return
  error.value = ''
  busy.value = true
  const failed = []
  for (const f of files) {
    if (!f.type.startsWith('audio/') && !/\.(mp3|wav|m4a|aac|ogg|oga|flac|opus|webm)$/i.test(f.name)) {
      failed.push(`${f.name}(不是音频文件)`)
      continue
    }
    try {
      const buffer = await decodeAudio(f)
      items.value.push({ id: ++seq, name: f.name, size: f.size, buffer, duration: buffer.duration })
    } catch {
      failed.push(`${f.name}(解码失败)`)
    }
  }
  busy.value = false
  if (failed.length) error.value = '以下文件未能加入:' + failed.join('、')
}

function move(index, dir) {
  const to = index + dir
  if (to < 0 || to >= items.value.length) return
  const list = items.value
  ;[list[index], list[to]] = [list[to], list[index]]
}

function remove(index) {
  items.value.splice(index, 1)
}

function clearAll() {
  items.value = []
  error.value = ''
  resetResult()
}

function resetResult() {
  if (result.value?.url) URL.revokeObjectURL(result.value.url)
  result.value = null
}

async function merge() {
  if (!canMerge.value) return
  resetResult()
  error.value = ''
  busy.value = true
  try {
    const sampleRate = items.value[0].buffer.sampleRate
    const tracks = items.value.map((it) => ({
      sampleRate: it.buffer.sampleRate,
      channels: trackChannels(it.buffer),
    }))
    const merged = mergeTracks(tracks, {
      sampleRate,
      gapSeconds: Number(gap.value) || 0,
      fadeSeconds: fade.value ? 0.01 : 0,
    })
    const blob = encodeWav(merged)
    const base = items.value[0].name.replace(/\.[^.]+$/, '') || '合并音频'
    result.value = {
      blob,
      url: URL.createObjectURL(blob),
      name: `${base}-merged.wav`,
      duration: mergeDuration(merged),
      size: blob.size,
    }
  } catch (e) {
    error.value = '合并失败:' + (e.message || e)
  } finally {
    busy.value = false
  }
}

function download() {
  if (result.value) downloadBlob(result.value.blob, result.value.name)
}

onUnmounted(resetResult)
</script>

<template>
  <p class="tip mb-14">
    按列表顺序把多段音频首尾拼接,统一声道并导出为 WAV。
    解码与合并都在浏览器本地完成,不上传;⚠️ 输出为未压缩 WAV,时长越长文件越大。
  </p>

  <div
    class="dropzone"
    :class="{ dragging }"
    @click="pick"
    @dragover.prevent="dragging = true"
    @dragleave.prevent="dragging = false"
    @drop.prevent="onDrop"
  >
    <input
      ref="fileInput"
      type="file"
      accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac,.opus"
      multiple
      class="sr-only"
      @change="onFileChange"
    />
    <div class="dz-icon"><AppIcon name="combine" :size="30" /></div>
    <p><strong>点击选择多个音频</strong> 或拖拽到此处</p>
    <p class="tip">支持浏览器可解码的 MP3 / WAV / M4A / OGG / FLAC 等;可一次选多个</p>
  </div>

  <div v-if="busy" class="tip mt-12">正在解码 / 合并,请稍候…</div>
  <div v-if="error" class="error-box mt-12">✗ {{ error }}</div>

  <template v-if="items.length">
    <div class="panel mt-14">
      <div class="row row-wrap">
        <strong>待合并 {{ items.length }} 段</strong>
        <span class="tip">总时长 {{ fmt(totalDuration) }} + 间隙 {{ (items.length - 1) * (Number(gap) || 0) }}s</span>
        <button class="btn btn-sm" @click="clearAll">清空列表</button>
      </div>

      <ol class="track-list mt-10">
        <li v-for="(it, i) in items" :key="it.id" class="track">
          <span class="track-index">{{ i + 1 }}</span>
          <div class="track-main">
            <div class="track-name">{{ it.name }}</div>
            <div class="track-meta">{{ fmt(it.duration) }} · {{ formatSize(it.size) }} · {{ it.buffer.sampleRate }} Hz</div>
          </div>
          <div class="track-ops">
            <button class="icon-btn" :disabled="i === 0" aria-label="上移" title="上移" @click="move(i, -1)">
              <AppIcon name="arrow-up" :size="15" />
            </button>
            <button class="icon-btn" :disabled="i === items.length - 1" aria-label="下移" title="下移" @click="move(i, 1)">
              <AppIcon name="chevron-down" :size="15" />
            </button>
            <button class="icon-btn danger" aria-label="移除" title="移除" @click="remove(i)">
              <AppIcon name="x" :size="15" />
            </button>
          </div>
        </li>
      </ol>

      <div class="row row-wrap mt-14">
        <label class="field gap-field">
          <span class="field-label">段间静音 {{ Number(gap).toFixed(1) }} 秒</span>
          <input v-model.number="gap" type="range" min="0" max="3" step="0.1" />
        </label>
        <label class="check">
          <input v-model="fade" type="checkbox" />
          接缝淡入淡出(10ms,防爆音)
        </label>
      </div>

      <div class="row mt-14">
        <button class="btn btn-primary" :disabled="!canMerge" @click="merge">
          <template v-if="busy">合并中…</template>
          <template v-else><AppIcon name="combine" :size="15" /> 合并并生成 WAV</template>
        </button>
        <span v-if="items.length < 2" class="tip">至少需要 2 段音频</span>
      </div>
    </div>
  </template>

  <div v-if="result" class="panel mt-14">
    <div class="row row-wrap">
      <strong><AppIcon name="circle-check" :size="16" /> 合并完成</strong>
      <span class="tip">{{ fmt(result.duration) }} · {{ formatSize(result.size) }} · WAV</span>
    </div>
    <audio class="mt-10" :src="result.url" controls style="width: 100%"></audio>
    <div class="row mt-10">
      <button class="btn btn-primary" @click="download">
        <AppIcon name="download" :size="15" /> 下载 {{ result.name }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.dropzone {
  border: 2px dashed var(--border);
  border-radius: var(--radius);
  padding: 42px 20px;
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
  margin-bottom: 6px;
}
.dropzone p {
  margin: 4px 0;
}
.track-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 8px;
}
.track {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-soft);
}
.track-index {
  flex: none;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 12px;
  color: var(--muted);
  border: 1px solid var(--border);
}
.track-main {
  flex: 1;
  min-width: 0;
}
.track-name {
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.track-meta {
  font-size: 12px;
  color: var(--muted);
  margin-top: 2px;
}
.track-ops {
  flex: none;
  display: flex;
  gap: 4px;
}
.icon-btn {
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--text);
  border-radius: 6px;
  width: 28px;
  height: 28px;
  display: inline-grid;
  place-items: center;
  cursor: pointer;
}
.icon-btn:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}
.icon-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
.icon-btn.danger:hover {
  border-color: var(--danger);
  color: var(--danger);
}
.gap-field {
  min-width: 220px;
}
.gap-field input[type='range'] {
  width: 100%;
}
</style>