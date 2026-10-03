<script setup>
import { computed, ref } from 'vue'
import { useCopy } from '@/utils/useCopy'

const mode = ref('encode')
const input = ref('Hello 工具箱')
const base = ref(16)
const spaced = ref(true)
const { copiedKey, copy } = useCopy()

const BASES = [
  { id: 2, label: '二进制' },
  { id: 8, label: '八进制' },
  { id: 10, label: '十进制' },
  { id: 16, label: '十六进制' },
]

// 各进制的合法字节 token 校验(整段校验,避免 parseInt 截断静默出错)
const TOKEN_RE = { 2: /^[01]+$/, 8: /^[0-7]+$/, 10: /^\d+$/, 16: /^[0-9a-f]+$/i }

function encode(text, b, sp) {
  const bytes = new TextEncoder().encode(text)
  return [...bytes].map((byte) => byte.toString(b).padStart(b === 16 ? 2 : b === 8 ? 3 : 8, '0')).join(sp ? ' ' : '')
}

function decode(text, b) {
  const parts = text.trim().split(/[\s,]+/).filter(Boolean)
  if (!spaced.value && parts.length === 1) {
    // 紧凑模式:按固定位宽切分
    const width = b === 16 ? 2 : b === 8 ? 3 : 8
    const raw = parts[0]
    for (let i = 0; i < raw.length; i += width) parts.push(raw.slice(i, i + width))
    parts.shift()
  }
  const bytes = parts.map((p) => {
    if (!TOKEN_RE[b].test(p)) throw new Error(`「${p}」不是合法的 ${b} 进制字节`)
    const v = parseInt(p, b)
    if (v > 255) throw new Error(`「${p}」超出字节范围(0 ~ 255)`)
    return v
  })
  return new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(bytes))
}

// 单一来源:同时产出结果与错误,避免重复执行
const result = computed(() => {
  const s = input.value.trim()
  if (!s) return { text: '', error: '' }
  try {
    return { text: mode.value === 'encode' ? encode(input.value, base.value, spaced.value) : decode(s, base.value), error: '' }
  } catch (e) {
    return { text: '', error: e.message }
  }
})
</script>

<template>
  <div class="row" style="margin-bottom: 10px">
    <label class="check"><input v-model="mode" type="radio" value="encode" />文本 → 进制字节</label>
    <label class="check"><input v-model="mode" type="radio" value="decode" />进制字节 → 文本</label>
    <label v-for="b in BASES" :key="b.id" class="check">
      <input v-model="base" type="radio" :value="b.id" />{{ b.label }}
    </label>
    <label class="check"><input v-model="spaced" type="checkbox" />字节间加空格</label>
  </div>

  <div v-if="result.error" class="error-box" style="margin-bottom: 12px">✗ {{ result.error }}</div>

  <div class="field">
    <label class="field-label">输入</label>
    <textarea v-model="input" class="textarea" rows="4" spellcheck="false"></textarea>
  </div>

  <label class="field-label">输出</label>
  <pre class="output">{{ result.text }}</pre>
  <div class="row" style="margin-top: 10px">
    <button class="btn btn-sm" @click="copy('out', result.text)">
      {{ copiedKey === 'out' ? '✓ 已复制' : '复制结果' }}
    </button>
    <button class="btn btn-sm" @click="input = result.text">将输出放入输入框</button>
  </div>

  <p class="tip" style="margin-top: 10px">按 UTF-8 字节序列转换;中文会被编码为 3 个字节。</p>
</template>
