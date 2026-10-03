<script setup>
import { computed, ref } from 'vue'
import { useCopy } from '@/utils/useCopy'

const mode = ref('escape')
const input = ref('你好,世界!Hello World')
const asciiOnly = ref(true)
const { copiedKey, copy } = useCopy()

function escapeStr(s) {
  let out = ''
  for (const ch of s) {
    const cp = ch.codePointAt(0)
    if (cp > 127 || (!asciiOnly.value && /[\\"]/.test(ch))) {
      if (cp > 0xffff) {
        // 代理对:拆成两个 \uXXXX
        const hi = Math.floor((cp - 0x10000) / 0x400) + 0xd800
        const lo = ((cp - 0x10000) % 0x400) + 0xdc00
        out += `\\u${hi.toString(16).padStart(4, '0')}\\u${lo.toString(16).padStart(4, '0')}`
      } else {
        out += `\\u${cp.toString(16).padStart(4, '0')}`
      }
    } else {
      out += ch
    }
  }
  return out
}

function unescapeStr(s) {
  return s
    .replace(/\\u\{([0-9a-fA-F]{1,6})\}/g, (m, h) => {
      const cp = parseInt(h, 16)
      if (cp > 0x10ffff) throw new Error(`\\u{${h}} 超出 Unicode 范围(最大 U+10FFFF)`)
      return String.fromCodePoint(cp)
    })
    .replace(/\\u([0-9a-fA-F]{4})/g, (m, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\x([0-9a-fA-F]{2})/g, (m, h) => String.fromCharCode(parseInt(h, 16)))
}

const result = computed(() => {
  const s = input.value
  if (!s) return { text: '', error: '' }
  try {
    return { text: mode.value === 'escape' ? escapeStr(s) : unescapeStr(s), error: '' }
  } catch (e) {
    return { text: '', error: e.message }
  }
})
</script>

<template>
  <div class="row" style="margin-bottom: 14px">
    <label class="check"><input v-model="mode" type="radio" value="escape" />文本 → \uXXXX</label>
    <label class="check"><input v-model="mode" type="radio" value="unescape" />\uXXXX → 文本</label>
    <label v-if="mode === 'escape'" class="check">
      <input v-model="asciiOnly" type="checkbox" />仅转义中文等非 ASCII 字符
    </label>
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
</template>
