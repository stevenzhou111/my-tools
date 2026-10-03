<script setup>
import { computed, ref } from 'vue'
import { useCopy } from '@/utils/useCopy'

const input = ref(`第一行

第三行(上面有空行)
重复行
重复行
  前后有空白
最后一个空格 `)

const output = ref('')
const lastOp = ref('')
const { copiedKey, copy } = useCopy()

function apply(name, fn) {
  output.value = fn(input.value)
  lastOp.value = name
}

const OPS = [
  { name: '删除空行', fn: (s) => s.split('\n').filter((l) => l.trim() !== '').join('\n') },
  { name: '删除重复行', fn: (s) => [...new Set(s.split('\n'))].join('\n') },
  { name: '删除所有空格', fn: (s) => s.replace(/[ \t]/g, '') },
  { name: '删除全部空白', fn: (s) => s.replace(/\s/g, '') },
  { name: '合并连续空白', fn: (s) => s.replace(/[ \t]+/g, ' ') },
  { name: '去除每行首尾空白', fn: (s) => s.split('\n').map((l) => l.trim()).join('\n') },
  { name: '去除所有换行', fn: (s) => s.replace(/\n+/g, '') },
]

const stats = computed(() => {
  const a = [...input.value]
  const b = [...output.value]
  return { before: a.length, after: b.length, saved: a.length - b.length }
})
</script>

<template>
  <div class="row" style="margin-bottom: 14px">
    <button v-for="op in OPS" :key="op.name" class="btn" @click="apply(op.name, op.fn)">
      {{ op.name }}
    </button>
    <button class="btn" @click="apply('', () => '')">清空输出</button>
  </div>

  <div class="grid-2">
    <div class="field" style="margin: 0">
      <label class="field-label">输入({{ stats.before }} 字符)</label>
      <textarea v-model="input" class="textarea" rows="9" spellcheck="false"></textarea>
    </div>
    <div class="field" style="margin: 0">
      <label class="field-label">
        输出({{ stats.after }} 字符<template v-if="lastOp">,已执行:{{ lastOp }}</template>)
      </label>
      <textarea v-model="output" class="textarea" rows="9" spellcheck="false"></textarea>
    </div>
  </div>

  <div class="row" style="margin-top: 10px">
    <button class="btn btn-sm" @click="copy('out', output)">
      {{ copiedKey === 'out' ? '✓ 已复制' : '复制输出' }}
    </button>
    <span v-if="stats.saved > 0" class="tip">共精简 {{ stats.saved }} 个字符</span>
  </div>
</template>
