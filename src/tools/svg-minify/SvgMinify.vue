<script setup>
import { computed, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import CopyButton from '@/components/CopyButton.vue'
import { downloadBlob } from '@/utils/image'
import { formatSize } from '@/utils/format'

/**
 * SVG 压缩:svgo 浏览器版(懒加载)本机优化,去除编辑器元数据/冗余属性/注释等。
 * 输出可实时预览与下载,全程不上传。
 */

const input = ref('')
const output = ref('')
const error = ref('')
const optimizing = ref(false)

const beforeSize = computed(() => new TextEncoder().encode(input.value).length)
const afterSize = computed(() => (output.value ? new TextEncoder().encode(output.value).length : 0))
const saved = computed(() => {
  if (!output.value || !beforeSize.value) return 0
  return Math.max(0, Math.round((1 - afterSize.value / beforeSize.value) * 100))
})
const previewUrl = computed(() =>
  output.value ? `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(output.value)))}` : '',
)
const inputPreviewUrl = computed(() =>
  input.value.trim() ? `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(input.value)))}` : '',
)

const SAMPLE = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
  <!-- 由设计工具导出 -->
  <g id="图层_1" data-name="图层 1">
    <circle cx="50" cy="50" r="40" fill="#6366f1" stroke="#000000" stroke-opacity="0" />
    <path d="M 30 50 Q 50 30 70 50" fill="none" stroke="#ffffff" stroke-width="4"/>
  </g>
</svg>`

function onFileChange(e) {
  const f = e.target.files?.[0]
  if (f) f.text().then((t) => { input.value = t; output.value = ''; run() })
}

async function run() {
  const svg = input.value.trim()
  error.value = ''
  output.value = ''
  if (!svg) return
  if (!/<svg[\s>]/i.test(svg)) return (error.value = '内容里没有 <svg> 标签,请粘贴完整的 SVG 文件')
  optimizing.value = true
  try {
    const { optimize } = await import('svgo/browser')
    const res = optimize(svg, {
      multipass: true,
      js2svg: { indent: 0, pretty: false },
    })
    output.value = res.data
  } catch (e) {
    error.value = '压缩失败:' + e.message
  } finally {
    optimizing.value = false
  }
}

function download() {
  downloadBlob(new Blob([output.value], { type: 'image/svg+xml' }), 'minified.svg')
}
</script>

<template>
  <div class="field">
    <label class="field-label" for="svg-in">粘贴 SVG 源码,或</label>
    <div class="row">
      <label class="btn btn-sm file-btn">
        <AppIcon name="file-code" :size="14" />选择 .svg 文件
        <input type="file" accept=".svg,image/svg+xml" class="sr-only" @change="onFileChange" />
      </label>
      <button class="btn btn-sm" @click="input = SAMPLE; run()">填入示例</button>
    </div>
    <textarea
      id="svg-in"
      v-model="input"
      class="textarea mt-10"
      style="min-height: 150px"
      spellcheck="false"
      :placeholder="'<svg xmlns=…></svg>'"
    ></textarea>
  </div>

  <div class="row mb-14">
    <button class="btn btn-primary" :disabled="!input.trim() || optimizing" @click="run">
      {{ optimizing ? '压缩中…' : '压缩' }}
    </button>
    <span v-if="output" class="tip">
      {{ formatSize(beforeSize) }} → <b>{{ formatSize(afterSize) }}</b>,省 {{ saved }}%
    </span>
  </div>

  <div v-if="error" class="error-box mb-14">✗ {{ error }}</div>

  <template v-if="output">
    <div class="two-col mb-14">
      <div class="preview-box">
        <p class="field-label">压缩前</p>
        <div class="canvas"><img v-if="inputPreviewUrl" :src="inputPreviewUrl" alt="压缩前预览" /></div>
      </div>
      <div class="preview-box">
        <p class="field-label">压缩后</p>
        <div class="canvas"><img v-if="previewUrl" :src="previewUrl" alt="压缩后预览" /></div>
      </div>
    </div>

    <label class="field-label" for="svg-out">压缩结果</label>
    <textarea id="svg-out" class="textarea" style="min-height: 130px" readonly :value="output"></textarea>
    <div class="row mt-10">
      <CopyButton class="btn btn-sm" :text="output" label="复制 SVG" />
      <button class="btn btn-sm" @click="download"><AppIcon name="download" :size="14" />下载</button>
    </div>
  </template>
</template>

<style scoped>
.file-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
@media (max-width: 760px) {
  .two-col { grid-template-columns: 1fr; }
}
.preview-box .canvas {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  min-height: 140px;
  display: grid;
  place-items: center;
  padding: 12px;
  background: repeating-conic-gradient(var(--bg-soft) 0% 25%, var(--card) 0% 50%) 0 0 / 20px 20px;
}
.canvas :deep(svg) {
  max-width: 100%;
  height: auto;
}
</style>
