<script setup>
import { computed, ref } from 'vue'
import { useCopy } from '@/utils/useCopy'

const input = ref(`这是第一行
这是第二行,  里面有  多余空格
这是一个	tab`)

const mode = ref('nl2sp')
const { copiedKey, copy } = useCopy()

const MODES = [
  { id: 'nl2sp', label: '换行 → 空格', hint: '所有换行替换为一个空格' },
  { id: 'sp2nl', label: '空格 → 换行', hint: '每个空格替换为换行' },
  { id: 'multi2nl', label: '连续空格 → 单个换行', hint: '连续多个空格合并为一个换行' },
  { id: 'tab2sp', label: 'Tab → 4 空格', hint: '制表符替换为 4 个空格' },
  { id: 'sp2tab', label: '4 空格 → Tab', hint: '连续 4 个空格替换为一个 Tab' },
]

const output = computed(() => {
  const s = input.value
  if (!s) return ''
  switch (mode.value) {
    case 'nl2sp': return s.replace(/\s*\n\s*/g, ' ').trim()
    case 'sp2nl': return s.replace(/ +/g, '\n')
    case 'multi2nl': return s.replace(/[ \t]{2,}/g, '\n')
    case 'tab2sp': return s.replace(/\t/g, '    ')
    case 'sp2tab': return s.replace(/ {4}/g, '\t')
    default: return s
  }
})
</script>

<template>
  <div class="row" style="margin-bottom: 8px">
    <label v-for="m in MODES" :key="m.id" class="check">
      <input v-model="mode" type="radio" :value="m.id" />{{ m.label }}
    </label>
  </div>
  <p class="tip" style="margin-bottom: 14px">{{ MODES.find((m) => m.id === mode).hint }}</p>

  <div class="field">
    <label class="field-label">输入文本</label>
    <textarea v-model="input" class="textarea" rows="6" spellcheck="false"></textarea>
  </div>

  <label class="field-label">输出结果</label>
  <pre class="output">{{ output }}</pre>
  <div class="row" style="margin-top: 10px">
    <button class="btn btn-sm" @click="copy('out', output)">
      {{ copiedKey === 'out' ? '✓ 已复制' : '复制结果' }}
    </button>
  </div>
</template>
