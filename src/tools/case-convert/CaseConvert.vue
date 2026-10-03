<script setup>
import { computed, ref } from 'vue'
import { useCopy } from '@/utils/useCopy'

const input = ref('hello vue toolbox, the online toolkit')
const mode = ref('upper')
const { copiedKey, copy } = useCopy()

const MODES = [
  { id: 'upper', label: '全部大写', fn: (s) => s.toUpperCase() },
  { id: 'lower', label: '全部小写', fn: (s) => s.toLowerCase() },
  {
    id: 'title',
    label: '标题大写',
    fn: (s) => s.toLowerCase().replace(/(^|[\s(\["]+)(\S)/g, (m, p, c) => p + c.toUpperCase()),
  },
  { id: 'sentence', label: '句首大写', fn: (s) => s.toLowerCase().replace(/(^\s*[a-z])|([.!?]\s+[a-z])/g, (m) => m.toUpperCase()) },
  { id: 'invert', label: '大小写互换', fn: (s) => [...s].map((c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase())).join('') },
  {
    id: 'camel',
    label: '转驼峰 camelCase',
    fn: (s) => {
      const camel = s.toLowerCase().replace(/[^a-z0-9]+(.)/g, (m, c) => c.toUpperCase()).replace(/[^a-zA-Z0-9]/g, '')
      return camel ? camel.charAt(0).toLowerCase() + camel.slice(1) : ''
    },
  },
  {
    id: 'pascal',
    label: '转帕斯卡 PascalCase',
    fn: (s) => {
      const camel = s.toLowerCase().replace(/[^a-z0-9]+(.)/g, (m, c) => c.toUpperCase()).replace(/[^a-zA-Z0-9]/g, '')
      return camel ? camel[0].toUpperCase() + camel.slice(1) : ''
    },
  },
  {
    id: 'snake',
    label: '转下划线 snake_case',
    fn: (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase(),
  },
  {
    id: 'kebab',
    label: '转中划线 kebab-case',
    fn: (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase(),
  },
]

const output = computed(() => {
  const m = MODES.find((x) => x.id === mode.value)
  return m ? m.fn(input.value) : ''
})
</script>

<template>
  <div class="field">
    <label class="field-label">输入文本</label>
    <textarea v-model="input" class="textarea" rows="4" spellcheck="false"></textarea>
  </div>

  <div class="row" style="margin-bottom: 14px">
    <label v-for="m in MODES" :key="m.id" class="check">
      <input v-model="mode" type="radio" :value="m.id" />{{ m.label }}
    </label>
  </div>

  <label class="field-label">输出结果</label>
  <pre class="output">{{ output }}</pre>
  <div class="row" style="margin-top: 10px">
    <button class="btn btn-sm" @click="copy('out', output)">
      {{ copiedKey === 'out' ? '✓ 已复制' : '复制结果' }}
    </button>
    <button class="btn btn-sm" @click="input = output">将结果放回输入框</button>
  </div>
</template>
