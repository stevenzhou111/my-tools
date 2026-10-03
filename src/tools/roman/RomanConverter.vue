<script setup>
import { computed, ref } from 'vue'
import { useCopy } from '@/utils/useCopy'

const mode = ref('encode')
const input = ref('2026')
const { copiedKey, copy } = useCopy()

const MAP = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'],
  [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'],
  [5, 'V'], [4, 'IV'], [1, 'I'],
]

const ROMAN_RE = /^[MDCLXVI]+$/

function toRoman(n) {
  let out = ''
  let v = n
  for (const [val, sym] of MAP) {
    while (v >= val) {
      out += sym
      v -= val
    }
  }
  return out
}

function fromRoman(s) {
  const values = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 }
  let total = 0
  for (let i = 0; i < s.length; i++) {
    const cur = values[s[i]]
    const next = values[s[i + 1]] ?? 0
    total += cur < next ? -cur : cur
  }
  return total
}

const result = computed(() => {
  const s = input.value.trim()
  if (!s) return { text: '', error: '' }
  if (mode.value === 'encode') {
    const n = Number(s)
    if (!/^\d+$/.test(s) || n < 1 || n > 3999) {
      return { text: '', error: '请输入 1 ~ 3999 之间的整数(罗马数字无法简洁表示 0 和更大的数)' }
    }
    return { text: toRoman(n), error: '' }
  }
  const up = s.toUpperCase()
  if (!ROMAN_RE.test(up)) return { text: '', error: '包含无效的罗马数字字符(仅支持 M D C L X V I)' }
  const n = fromRoman(up)
  if (toRoman(n) !== up) return { text: '', error: '罗马数字书写格式不合法' }
  return { text: String(n), error: '' }
})
</script>

<template>
  <div class="row" style="margin-bottom: 14px">
    <label class="check"><input v-model="mode" type="radio" value="encode" />数字 → 罗马数字</label>
    <label class="check"><input v-model="mode" type="radio" value="decode" />罗马数字 → 数字</label>
  </div>

  <div class="field">
    <label class="field-label">{{ mode === 'encode' ? '输入数字' : '输入罗马数字' }}</label>
    <input v-model="input" class="input" :placeholder="mode === 'encode' ? '如 2026' : '如 MMXXVI'" spellcheck="false" />
  </div>

  <div v-if="result.error" class="error-box">✗ {{ result.error }}</div>

  <template v-else-if="result.text">
    <label class="field-label">转换结果</label>
    <pre class="output">{{ result.text }}</pre>
    <div class="row" style="margin-top: 10px">
      <button class="btn btn-sm" @click="copy('out', result.text)">
        {{ copiedKey === 'out' ? '✓ 已复制' : '复制结果' }}
      </button>
    </div>
  </template>
</template>
