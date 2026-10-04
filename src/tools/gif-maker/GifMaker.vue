<script setup>
import { computed, ref } from 'vue'
import { drawFrame, framesToGifBlob } from '@/utils/gif'
import { downloadBlob } from '@/utils/image'
import AppIcon from '@/components/AppIcon.vue'

const fileInput = ref(null)
const frames = ref([]) // { id, url(原图预览), img, delay }
const size = ref(256)
const background = ref('#ffffff')
const transparent = ref(false)
const busy = ref(false)
const error = ref('')
const resultUrl = ref('')
const resultSize = ref(0)
let uid = 0

const totalDelay = computed(() => frames.value.reduce((s, f) => s + (f.delay || 300), 0))

function pick() {
  fileInput.value?.click()
}

async function onFiles(e) {
  const files = [...e.target.files ?? []]
  e.target.value = ''
  await addFiles(files)
}

async function addFiles(files) {
  for (const f of files) {
    if (!/\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(f.name)) {
      error.value = `跳过不支持的文件:${f.name}`
      continue
    }
    try {
      const img = await loadImage(f)
      frames.value.push({ id: ++uid, url: URL.createObjectURL(f), img, delay: 300 })
      error.value = ''
    } catch (err) {
      error.value = `无法读取 ${f.name}:${err.message}`
    }
  }
}

function loadImage(f) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('不是有效图片'))
    img.src = URL.createObjectURL(f)
  })
}

function move(i, dir) {
  const j = i + dir
  if (j < 0 || j >= frames.value.length) return
  ;[frames.value[i], frames.value[j]] = [frames.value[j], frames.value[i]]
}

function remove(i) {
  URL.revokeObjectURL(frames.value[i].url)
  frames.value.splice(i, 1)
}

async function generate() {
  if (!frames.value.length) return
  busy.value = true
  error.value = ''
  resultUrl.value && URL.revokeObjectURL(resultUrl.value)
  resultUrl.value = ''
  try {
    const data = frames.value.map((f) => ({
      ...drawFrame(f.img, size.value, transparent.value ? null : background.value),
      delay: f.delay || 300,
    }))
    const blob = await framesToGifBlob(data, { transparent: transparent.value })
    resultUrl.value = URL.createObjectURL(blob)
    resultSize.value = blob.size
  } catch (e) {
    error.value = '合成失败:' + (e.message || e)
  } finally {
    busy.value = false
  }
}

async function downloadGif() {
  if (!frames.value.length) return
  const data = frames.value.map((f) => ({
    ...drawFrame(f.img, size.value, transparent.value ? null : background.value),
    delay: f.delay || 300,
  }))
  const blob = await framesToGifBlob(data, { transparent: transparent.value })
  downloadBlob(blob, 'animation.gif')
}
</script>

<template>
  <div class="field">
    <label class="field-label">添加帧图片(可多选,支持反复追加)</label>
    <div class="dropzone" @click="pick" @dragover.prevent @drop.prevent="addFiles([...$event.dataTransfer.files])">
      <input ref="fileInput" type="file" accept="image/*" multiple hidden @change="onFiles" />
      <p><strong>点击选择图片</strong> 或拖拽到此处</p>
      <p class="tip">每张图为一帧,按下方列表顺序播放</p>
    </div>
  </div>

  <div v-if="error" class="error-box">✗ {{ error }}</div>

  <template v-if="frames.length">
    <div class="row" style="margin: 12px 0">
      <label class="check">
        尺寸
        <select v-model.number="size" class="select" style="width: 100px">
          <option :value="128">128</option>
          <option :value="256">256</option>
          <option :value="320">320</option>
          <option :value="480">480</option>
        </select>
      </label>
      <label class="check">
        底色
        <input v-model="background" type="color" class="input color-input" style="width: 46px" aria-label="背景色" />
      </label>
      <label class="check"><input v-model="transparent" type="checkbox" />透明背景(表情包)</label>
    </div>

    <label class="field-label">帧列表({{ frames.length }} 帧 · 总时长约 {{ (totalDelay / 1000).toFixed(1) }} 秒)</label>
    <div class="frame-list panel">
      <div v-for="(f, i) in frames" :key="f.id" class="frame-row">
        <img :src="f.url" class="thumb" :alt="`第 ${i + 1} 帧预览`" />
        <span class="frame-no">{{ i + 1 }}</span>
        <label class="check">
          {{ f.delay }}ms
          <input
            type="range" min="50" max="1500" step="50" :value="f.delay"
            style="width: 110px" :aria-label="`第 ${i + 1} 帧停留时长`"
            @input="frames[i].delay = Number($event.target.value)"
          />
        </label>
        <span class="frame-ops">
          <button class="btn btn-sm" :disabled="i === 0" aria-label="上移" @click="move(i, -1)"><AppIcon name="chevron-down" :size="13" style="transform: rotate(180deg)" /></button>
          <button class="btn btn-sm" :disabled="i === frames.length - 1" aria-label="下移" @click="move(i, 1)"><AppIcon name="chevron-down" :size="13" /></button>
          <button class="btn btn-sm" aria-label="删除此帧" @click="remove(i)"><AppIcon name="x" :size="13" /></button>
        </span>
      </div>
    </div>

    <div class="row" style="margin-top: 14px">
      <button class="btn btn-primary" :disabled="busy" @click="generate">
        {{ busy ? '合成中…' : '预览动图' }}
      </button>
    </div>

    <template v-if="resultUrl">
      <div class="panel result-panel">
        <img :src="resultUrl" alt="GIF 预览" style="max-width: 100%; image-rendering: pixelated" />
        <p class="tip">{{ size }}×{{ size }} · {{ (resultSize / 1024).toFixed(1) }} KB</p>
      </div>
      <div class="row" style="margin-top: 10px">
        <button class="btn btn-primary" :disabled="busy" @click="downloadGif">下载 GIF</button>
      </div>
    </template>
  </template>
</template>

<style scoped>
.dropzone {
  border: 2px dashed var(--border);
  border-radius: var(--radius);
  padding: 30px 16px;
  text-align: center;
  cursor: pointer;
}
.dropzone:hover {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.color-input {
  padding: 2px;
  cursor: pointer;
}
.frame-list {
  padding: 6px 0;
}
.frame-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 14px;
}
.frame-row + .frame-row {
  border-top: 1px solid var(--border);
}
.thumb {
  width: 44px;
  height: 44px;
  object-fit: cover;
  border-radius: 8px;
  background: var(--bg-soft);
}
.frame-no {
  width: 20px;
  color: var(--muted);
  font-family: var(--mono);
  font-size: 13px;
}
.frame-ops {
  margin-left: auto;
  display: flex;
  gap: 6px;
}
.result-panel {
  margin-top: 14px;
  text-align: center;
  padding: 18px;
}
</style>