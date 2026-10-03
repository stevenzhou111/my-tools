<script setup>
import { computed, ref } from 'vue'
import { useCopy } from '@/utils/useCopy'

const mode = ref('encode')
const urlSafe = ref(false)
const input = ref('你好,工具箱!Hello, toolbox!')
const { copiedKey, copy } = useCopy()

function encode(text, urlSafeMode) {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  let b64 = btoa(bin)
  if (urlSafeMode) b64 = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return b64
}

function decode(b64, urlSafeMode) {
  let s = b64.trim()
  if (urlSafeMode) {
    s = s.replace(/-/g, '+').replace(/_/g, '/')
    while (s.length % 4) s += '='
  }
  const bin = atob(s)
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

const output = computed(() => {
  const s = input.value
  if (!s) return ''
  try {
    return mode.value === 'encode' ? encode(s, urlSafe.value) : decode(s, urlSafe.value)
  } catch {
    return ''
  }
})

const error = computed(() => {
  if (mode.value === 'decode' && input.value.trim() && output.value === '') {
    return '无效的 Base64 字符串,请检查输入'
  }
  return ''
})
</script>

<template>
  <div class="row" style="margin-bottom: 14px">
    <label class="check"><input v-model="mode" type="radio" value="encode" />编码(文本 → Base64)</label>
    <label class="check"><input v-model="mode" type="radio" value="decode" />解码(Base64 → 文本)</label>
    <label class="check">
      <input v-model="urlSafe" type="checkbox" />
      URL 安全模式(- _ 替代 + /)
    </label>
  </div>

  <div class="field">
    <label class="field-label">输入</label>
    <textarea v-draft="'base64'" v-model="input" class="textarea" rows="6" spellcheck="false"></textarea>
  </div>

  <div v-if="error" class="error-box" style="margin-bottom: 12px">✗ {{ error }}</div>

  <template v-if="output">
    <label class="field-label">输出</label>
    <pre class="output">{{ output }}</pre>
    <div class="row" style="margin-top: 10px">
      <button class="btn btn-sm" @click="copy('out', output)">
        {{ copiedKey === 'out' ? '✓ 已复制' : '复制输出' }}
      </button>
      <button class="btn btn-sm" @click="input = output">将输出放入输入框</button>
    </div>
  </template>
</template>
