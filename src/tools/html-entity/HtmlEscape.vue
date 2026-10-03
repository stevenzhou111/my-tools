<script setup>
import { computed, ref } from 'vue'
import { useCopy } from '@/utils/useCopy'

const mode = ref('escape')
const input = ref(`<div class="hello">你好 & 欢迎使用 "工具箱"</div>`)
const { copiedKey, copy } = useCopy()

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// 复用单个离屏元素做实体解码,避免 computed 内反复创建 DOM
const decoderEl = document.createElement('textarea')

function unescapeHtml(s) {
  decoderEl.innerHTML = s
  const value = decoderEl.value
  decoderEl.innerHTML = ''
  return value
}

const output = computed(() => {
  const s = input.value
  if (!s) return ''
  return mode.value === 'escape' ? escapeHtml(s) : unescapeHtml(s)
})
</script>

<template>
  <div class="row" style="margin-bottom: 14px">
    <label class="check"><input v-model="mode" type="radio" value="escape" />转义(&lt; → &amp;lt;)</label>
    <label class="check"><input v-model="mode" type="radio" value="unescape" />反转义(&amp;lt; → &lt;)</label>
  </div>

  <div class="field">
    <label class="field-label">输入</label>
    <textarea v-model="input" class="textarea" rows="6" spellcheck="false"></textarea>
  </div>

  <label class="field-label">输出</label>
  <pre class="output">{{ output }}</pre>
  <div class="row" style="margin-top: 10px">
    <button class="btn btn-sm" @click="copy('out', output)">
      {{ copiedKey === 'out' ? '✓ 已复制' : '复制输出' }}
    </button>
    <button class="btn btn-sm" @click="input = output">将输出放入输入框</button>
  </div>
</template>
