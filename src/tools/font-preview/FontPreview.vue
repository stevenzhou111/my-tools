<script setup>
import { computed, onUnmounted, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import CopyButton from '@/components/CopyButton.vue'
import { formatSize } from '@/utils/format'

/**
 * 本地字体预览器:上传 .ttf/.otf/.woff/.woff2,经 FontFace API 本机加载预览,
 * 并生成可直接使用的 @font-face CSS 片段。字体文件全程不上传。
 */

const ACCEPT = '.ttf,.otf,.woff,.woff2'
const FAMILY = 'toolbox-font-preview'

const fileInput = ref(null)
const dragging = ref(false)
const error = ref('')
const loaded = ref(false)
const fileInfo = ref('')
const previewText = ref('小时不识月,呼作白玉盘。The quick brown fox jumps over the lazy dog. 0123456789')
const fontSize = ref(36)
const fontWeight = ref(400)
const italic = ref(false)

let fontFace = null

async function load(file) {
  error.value = ''
  loaded.value = false
  if (!/\.(ttf|otf|woff2?)$/i.test(file.name)) return (error.value = '请选择字体文件(.ttf / .otf / .woff / .woff2)')
  try {
    const buf = await file.arrayBuffer()
    if (fontFace) { try { document.fonts.delete(fontFace) } catch { /* 忽略 */ } }
    fontFace = new FontFace(FAMILY, buf)
    await fontFace.load()
    document.fonts.add(fontFace)
    loaded.value = true
    fileInfo.value = `${file.name} · ${formatSize(file.size)}`
    cssFamily.value = file.name.replace(/\.[^.]+$/, '').replace(/[^\w-]+/g, '-')
  } catch (e) {
    error.value = '字体加载失败:文件可能损坏或格式不受支持(' + e.message + ')'
  }
}

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

const cssFamily = ref('my-font')
const format = computed(() => {
  const name = fileInfo.value.toLowerCase()
  if (name.endsWith('.woff2')) return 'woff2'
  if (name.endsWith('.woff')) return 'woff'
  if (name.endsWith('.otf')) return 'opentype'
  return 'truetype'
})

const cssSnippet = computed(() => `@font-face {
  font-family: '${cssFamily.value || 'my-font'}';
  src: url('./fonts/${(fileInfo.value.split(' · ')[0] || 'font.woff2')}') format('${format.value}');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

body {
  font-family: '${cssFamily.value || 'my-font'}', sans-serif;
}`)

onUnmounted(() => {
  if (fontFace) { try { document.fonts.delete(fontFace) } catch { /* 忽略 */ } }
})
</script>

<template>
  <div
    class="dropzone"
    :class="{ dragging }"
    tabindex="0"
    @click="pick"
    @keydown.enter.prevent="pick"
    @dragover.prevent="dragging = true"
    @dragleave.prevent="dragging = false"
    @drop.prevent="onDrop"
  >
    <input ref="fileInput" type="file" :accept="ACCEPT" class="sr-only" @change="onFileChange" />
    <div class="dz-icon"><AppIcon name="text-cursor-input" :size="30" /></div>
    <p><strong>点击选择字体文件</strong>,拖拽到此处</p>
    <p class="tip">支持 .ttf / .otf / .woff / .woff2,文件在本机加载,不会上传</p>
  </div>

  <p v-if="fileInfo" class="tip m-0 mt-8">已加载:{{ fileInfo }}</p>
  <div v-if="error" class="error-box mt-14">✗ {{ error }}</div>

  <template v-if="loaded">
    <div class="panel mt-14">
      <div class="row mb-14 ctrl-row">
        <label class="ctrl grow">
          <span class="field-label">预览文本</span>
          <input v-model="previewText" class="input" />
        </label>
        <label class="ctrl">
          <span class="field-label">字号 {{ fontSize }}px</span>
          <input v-model.number="fontSize" type="range" min="14" max="96" />
        </label>
        <label class="ctrl">
          <span class="field-label">字重</span>
          <select v-model.number="fontWeight" class="select">
            <option :value="300">细 300</option>
            <option :value="400">常规 400</option>
            <option :value="600">半粗 600</option>
            <option :value="700">粗 700</option>
          </select>
        </label>
        <label class="check"><input v-model="italic" type="checkbox" />斜体</label>
      </div>

      <div
        class="preview-area"
        :style="{ fontFamily: `'${FAMILY}', sans-serif`, fontSize: fontSize + 'px', fontWeight, fontStyle: italic ? 'italic' : 'normal' }"
      >
        {{ previewText }}
      </div>

      <div class="glyphs" :style="{ fontFamily: `'${FAMILY}', sans-serif` }">
        <span v-for="ch in 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'" :key="ch" class="glyph">{{ ch }}</span>
      </div>
    </div>

    <div class="panel mt-14">
      <label class="field-label" for="font-family">@font-face 片段(font-family 名可改)</label>
      <input id="font-family" v-model="cssFamily" class="input mb-10" />
      <pre class="output">{{ cssSnippet }}</pre>
      <div class="row mt-10">
        <CopyButton class="btn btn-sm" :text="cssSnippet" label="复制 CSS" />
      </div>
      <p class="tip m-0 mt-10">src 路径按项目常见目录写的相对路径,放进项目后按实际位置调整。</p>
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
.preview-area {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
  line-height: 1.5;
  word-break: break-all;
  background: var(--bg-soft);
}
.glyphs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  margin-top: 14px;
  font-size: 20px;
  color: var(--muted);
}
</style>
