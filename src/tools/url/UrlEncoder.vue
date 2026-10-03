<script setup>
import { computed, ref } from 'vue'
import { useCopy } from '@/utils/useCopy'

const mode = ref('encode')
const plusForSpace = ref(false)
const input = ref('https://example.com/搜索?q=工具箱&page=1')
const { copiedKey, copy } = useCopy()

const output = computed(() => {
  const s = input.value
  if (!s) return ''
  try {
    if (mode.value === 'encode') {
      const enc = encodeURIComponent(s)
      return plusForSpace.value ? enc.replace(/%20/g, '+') : enc
    }
    const prepared = plusForSpace.value ? s.replace(/\+/g, '%20') : s
    return decodeURIComponent(prepared)
  } catch {
    return ''
  }
})

const error = computed(() => {
  if (mode.value === 'decode' && input.value.trim() && output.value === '') {
    return '无法解码:包含无效的百分号编码'
  }
  return ''
})
</script>

<template>
  <div class="row" style="margin-bottom: 14px">
    <label class="check"><input v-model="mode" type="radio" value="encode" />编码</label>
    <label class="check"><input v-model="mode" type="radio" value="decode" />解码</label>
    <label class="check">
      <input v-model="plusForSpace" type="checkbox" />
      {{ mode === 'encode' ? '空格转 + (表单风格)' : '把 + 当作空格' }}
    </label>
  </div>

  <div class="field">
    <label class="field-label">输入</label>
    <textarea v-model="input" class="textarea" rows="5" spellcheck="false"></textarea>
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
