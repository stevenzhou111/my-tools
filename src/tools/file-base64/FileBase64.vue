<script setup>
import AppIcon from '@/components/AppIcon.vue'
import CopyButton from '@/components/CopyButton.vue'
import { computed, ref } from 'vue'
import {
  buildDataUrl,
  decodeBase64,
  fileNameForMime,
  guessMime,
  splitDataUrl,
} from '@/utils/fileBase64'
import { formatSize } from '@/utils/format'
import { downloadBlob } from '@/utils/image'

const MAX_BYTES = 20 * 1024 * 1024

const mode = ref('encode')
const fileInput = ref(null)
const dragging = ref(false)
const error = ref('')

const file = ref(null)
const dataUrl = ref('')
const format = ref('dataurl')

const pasted = ref('')
const nameInput = ref('decoded')
const parsed = ref(null)

const mime = computed(() => file.value?.type || (file.value ? guessMime(file.value.name) : ''))

const rawBase64 = computed(() => {
  const comma = dataUrl.value.indexOf(',')
  return comma < 0 ? '' : dataUrl.value.slice(comma + 1)
})

const encoded = computed(() => (format.value === 'dataurl' ? dataUrl.value : rawBase64.value))

const encodeName = computed(() => {
  const base = file.value?.name || 'file'
  return `${base}.${format.value === 'dataurl' ? 'dataurl' : 'base64'}.txt`
})

const growth = computed(() => {
  if (!file.value) return ''
  if (!file.value.size) return `编码后 ${formatSize(encoded.value.length)}`
  return `编码后 ${formatSize(encoded.value.length)} · 约增大 ${Math.round((encoded.value.length / file.value.size - 1) * 100)}%`
})

function setMode(next) {
  mode.value = next
  error.value = ''
}

function pick() {
  fileInput.value?.click()
}

function onFileChange(e) {
  const f = e.target.files?.[0]
  e.target.value = ''
  if (f) process(f)
}

function onDrop(e) {
  dragging.value = false
  const f = e.dataTransfer?.files?.[0]
  if (f) process(f)
}

function process(f) {
  error.value = ''
  dataUrl.value = ''
  parsed.value = null
  if (f.size > MAX_BYTES) {
    error.value = `文件 ${formatSize(f.size)} 超过 20MB,Base64 结果过大,请换小文件或用命令行处理`
    return
  }
  file.value = f
  const reader = new FileReader()
  reader.onload = () => {
    dataUrl.value = String(reader.result || '')
  }
  reader.onerror = () => {
    error.value = '读取文件失败'
  }
  reader.readAsDataURL(f)
}

function downloadText() {
  downloadBlob(new Blob([encoded.value], { type: 'text/plain;charset=utf-8' }), encodeName.value)
}

function resetEncode() {
  file.value = null
  dataUrl.value = ''
  error.value = ''
}

function parsePasted() {
  parsed.value = null
  error.value = ''
  const split = splitDataUrl(pasted.value)
  if (split.error) {
    error.value = split.error
    return
  }
  const decoded = decodeBase64(split.base64)
  if (decoded.error) {
    error.value = decoded.error
    return
  }
  if (decoded.bytes.length > MAX_BYTES) {
    error.value = `解码后 ${formatSize(decoded.bytes.length)} 超过 20MB,请换小文件或用命令行处理`
    return
  }
  const guessed = split.mime || guessMime(nameInput.value)
  const base = nameInput.value.trim() || 'decoded'
  const name = /\.[a-z0-9-]+$/i.test(base) ? base : fileNameForMime(guessed, base)
  parsed.value = { bytes: decoded.bytes, mime: guessed, name, size: decoded.bytes.length }
}

function downloadDecoded() {
  if (!parsed.value) return
  downloadBlob(new Blob([parsed.value.bytes], { type: parsed.value.mime }), parsed.value.name)
}

function clearPaste() {
  pasted.value = ''
  parsed.value = null
  error.value = ''
}</script>

<template>
  <p class="tip mb-14">
    任意文件与 Base64 / Data URL 双向转换。文件只在浏览器本地读取,不上传;请勿把含密钥、凭据的内容粘贴到公共页面。
  </p>

  <div class="row mb-14">
    <button class="btn btn-sm" :class="{ 'btn-primary': mode === 'encode' }" @click="setMode('encode')">
      <AppIcon name="file-digit" :size="15" /> 文件 → Base64
    </button>
    <button class="btn btn-sm" :class="{ 'btn-primary': mode === 'decode' }" @click="setMode('decode')">
      <AppIcon name="arrow-left-right" :size="15" /> Base64 → 文件
    </button>
  </div>

  <div v-if="error" class="error-box mb-12">✗ {{ error }}</div>

  <template v-if="mode === 'encode'">
    <div
      class="dropzone"
      :class="{ dragging }"
      @click="pick"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop"
    >
      <input ref="fileInput" type="file" class="sr-only" @change="onFileChange" />
      <div class="dz-icon"><AppIcon name="file-digit" :size="30" /></div>
      <p><strong>点击选择任意文件</strong> 或拖拽到此处</p>
      <p class="tip">不超过 20MB;图片可用专门的「图片转 Base64」生成 img / CSS 片段</p>
    </div>

    <template v-if="file && dataUrl">
      <div class="panel mt-14">
        <div class="row row-wrap">
          <strong>{{ file.name }}</strong>
          <span class="tip">{{ formatSize(file.size) }} · {{ mime || '未知类型' }}</span>
          <button class="btn btn-sm" @click="resetEncode">清空</button>
        </div>

        <div class="row row-wrap mt-10">
          <label class="field">
            <span class="field-label">输出格式</span>
            <select v-model="format" class="select">
              <option value="dataurl">Data URL(data:image/…;base64,…)</option>
              <option value="base64">纯 Base64</option>
            </select>
          </label>
          <span class="tip">{{ growth }}</span>
        </div>

        <div class="field mt-12">
          <label class="field-label">结果</label>
          <textarea class="textarea mono" rows="9" readonly :value="encoded"></textarea>
        </div>

        <div class="row row-wrap mt-10">
          <CopyButton class="btn btn-sm btn-primary" :text="encoded" label="复制结果" />
          <button class="btn btn-sm" @click="downloadText">
            <AppIcon name="download" :size="15" /> 下载 .txt
          </button>
        </div>
        <p class="tip mt-8">
          Data URL 可直接放进 img / video 的 src 或 CSS url();体积约为原文件的 1.33 倍。
        </p>
      </div>
    </template>
  </template>

  <template v-else>
    <div class="field">
      <label class="field-label" for="fb-input">粘贴 Data URL 或纯 Base64</label>
      <textarea
        id="fb-input"
        v-model="pasted"
        class="textarea mono"
        rows="9"
        spellcheck="false"
        placeholder="data:application/pdf;base64,JVBERi0xLjQK…"
        @input="parsed = null"
      ></textarea>
    </div>

    <div class="row row-wrap mt-10">
      <div class="field">
        <label class="field-label" for="fb-name">保存文件名</label>
        <input id="fb-name" v-model="nameInput" class="input" placeholder="decoded" @input="parsed = null" />
      </div>
      <button class="btn btn-primary" @click="parsePasted">解析</button>
      <button class="btn" @click="clearPaste">清空</button>
    </div>
    <p class="tip mt-6">没写扩展名时会按 Data URL 的 MIME 自动补全;纯 Base64 无法判断类型,默认 .bin。</p>

    <div v-if="parsed" class="panel mt-14">
      <div class="row row-wrap">
        <strong><AppIcon name="circle-check" :size="16" /> 解析成功</strong>
        <span class="tip">{{ parsed.mime }} · {{ formatSize(parsed.size) }}</span>
      </div>
      <div class="row row-wrap mt-10">
        <span class="tip">将保存为 <strong>{{ parsed.name }}</strong></span>
        <button class="btn btn-primary" @click="downloadDecoded">
          <AppIcon name="download" :size="15" /> 下载文件
        </button>
      </div>
      <p class="tip mt-8">工具只还原并下载文件,不会在页面里打开;来源不明的可执行文件请谨慎运行。</p>
    </div>
  </template>
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
.mono {
  font-family: var(--mono, ui-monospace, SFMono-Regular, Consolas, monospace);
  font-size: 12px;
  line-height: 1.5;
  word-break: break-all;
}
</style>