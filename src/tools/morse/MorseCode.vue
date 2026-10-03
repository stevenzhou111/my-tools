<script setup>
import { computed, ref } from 'vue'
import { useCopy } from '@/utils/useCopy'

const TABLE = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....',
  I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.',
  Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
  Y: '-.--', Z: '--..',
  0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....',
  6: '-....', 7: '--...', 8: '---..', 9: '----.',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', '!': '-.-.--', '/': '-..-.',
  '(': '-.--.', ')': '-.--.-', '&': '.-...', ':': '---...', ';': '-.-.-.',
  '=': '-...-', '+': '.-.-.', '-': '-....-', '_': '..--.-', '"': '.-..-.-', '@': '.--.-.',
}
const REVERSE = Object.fromEntries(Object.entries(TABLE).map(([k, v]) => [v, k]))

const mode = ref('encode')
const input = ref('SOS 你好 TOOLBOX')
const { copiedKey, copy } = useCopy()

const output = computed(() => {
  const s = input.value.trim()
  if (!s) return ''
  if (mode.value === 'encode') {
    return s
      .toUpperCase()
      .split(/\s+/)
      .map((word) =>
        [...word]
          .map((ch) => TABLE[ch] ?? '#')
          .filter(Boolean)
          .join(' '),
      )
      .filter(Boolean)
      .join(' / ')
  }
  return s
    .split(/\s*\/\s*/)
    .filter((word) => word.trim())
    .map((word) =>
      word
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((code) => REVERSE[code] ?? '?')
        .join(''),
    )
    .join(' ')
})

const unknown = computed(() => {
  if (mode.value === 'encode') return [...input.value.toUpperCase()].some((ch) => ch.trim() && !TABLE[ch])
  return input.value.split(/[\s/]+/).some((c) => c && !(c in REVERSE))
})
</script>

<template>
  <div class="row" style="margin-bottom: 14px">
    <label class="check"><input v-model="mode" type="radio" value="encode" />文本 → 摩尔斯电码</label>
    <label class="check"><input v-model="mode" type="radio" value="decode" />摩尔斯电码 → 文本</label>
  </div>

  <div class="field">
    <label class="field-label">{{ mode === 'encode' ? '输入文本' : '输入摩尔斯电码(字母间空格,单词间 / )' }}</label>
    <textarea v-model="input" class="textarea" rows="4" spellcheck="false"></textarea>
  </div>

  <label class="field-label">输出结果</label>
  <pre class="output">{{ output }}</pre>
  <div class="row" style="margin-top: 10px">
    <button class="btn btn-sm" @click="copy('out', output)">
      {{ copiedKey === 'out' ? '✓ 已复制' : '复制结果' }}
    </button>
    <span v-if="unknown && output" class="tip">⚠️ 包含无法转换的字符(以 {{ mode === 'encode' ? '#' : '?' }} 标出)</span>
  </div>
</template>
