<script setup>
import { computed, ref } from 'vue'
import { useCopy } from '@/utils/useCopy'

const input = ref(`Hello, 工具箱!
第二行文字`)

const mode = ref('all')
const { copiedKey, copy } = useCopy()

// 按字形簇(grapheme)反转,组合字符与 ZWJ emoji 不会被拆散
function reverseText(s) {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const seg = new Intl.Segmenter('zh', { granularity: 'grapheme' })
    return [...seg.segment(s)].map((x) => x.segment).reverse().join('')
  }
  return [...s].reverse().join('')
}

const output = computed(() => {
  const s = input.value
  if (!s) return ''
  if (mode.value === 'all') return reverseText(s)
  return s.split('\n').map((line) => reverseText(line)).join('\n')
})
</script>

<template>
  <div class="row" style="margin-bottom: 14px">
    <label class="check"><input v-model="mode" type="radio" value="all" />反转整段文本</label>
    <label class="check"><input v-model="mode" type="radio" value="lines" />逐行反转(保持行序)</label>
  </div>

  <div class="field">
    <label class="field-label">输入文本</label>
    <textarea v-model="input" class="textarea" rows="5" spellcheck="false"></textarea>
  </div>

  <label class="field-label">输出结果</label>
  <pre class="output">{{ output }}</pre>
  <div class="row" style="margin-top: 10px">
    <button class="btn btn-sm" @click="copy('out', output)">
      {{ copiedKey === 'out' ? '✓ 已复制' : '复制结果' }}
    </button>
  </div>
</template>
