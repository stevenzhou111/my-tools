<script setup>
import { computed, ref } from 'vue'
import { useCopy } from '@/utils/useCopy'

const input = ref(`苹果,香蕉,橙子,葡萄,西瓜,芒果`)
const mode = ref('sep')
const sep = ref(',')
const chunkSize = ref(10)
const { copiedKey, copy } = useCopy()

const output = computed(() => {
  const s = input.value
  if (!s) return []
  let parts
  if (mode.value === 'sep') {
    if (!sep.value) return []
    parts = s.split(sep.value)
  } else {
    const n = Math.max(1, Math.floor(Number(chunkSize.value) || 1))
    const chars = [...s]
    parts = []
    for (let i = 0; i < chars.length; i += n) parts.push(chars.slice(i, i + n).join(''))
  }
  return parts.map((p) => p.trim()).filter((p) => p !== '')
})

const numbered = computed(() => output.value.map((p, i) => `${i + 1}. ${p}`))
</script>

<template>
  <div class="row" style="margin-bottom: 8px">
    <label class="check"><input v-model="mode" type="radio" value="sep" />按分隔符分割</label>
    <label class="check"><input v-model="mode" type="radio" value="fixed" />按固定长度分割</label>
  </div>
  <div class="row" style="margin-bottom: 14px">
    <template v-if="mode === 'sep'">
      <input v-model="sep" class="input sep-input" placeholder="分隔符,如 , 或 |" spellcheck="false" />
      <button class="btn btn-sm" @click="sep = ','">逗号</button>
      <button class="btn btn-sm" @click="sep = ' '">空格</button>
      <button class="btn btn-sm" @click="sep = '|'">竖线</button>
      <button class="btn btn-sm" @click="sep = '\n'">换行</button>
    </template>
    <template v-else>
      <label class="check">
        每 <input v-model.number="chunkSize" type="number" min="1" class="input num-input" /> 个字符一段
      </label>
    </template>
  </div>

  <div class="field">
    <label class="field-label">输入文本</label>
    <textarea v-model="input" class="textarea" rows="5" spellcheck="false"></textarea>
  </div>

  <template v-if="output.length">
    <label class="field-label">分割结果({{ output.length }} 段)</label>
    <pre class="output">{{ output.join('\n') }}</pre>
    <div class="row" style="margin-top: 10px">
      <button class="btn btn-sm" @click="copy('plain', output.join('\n'))">
        {{ copiedKey === 'plain' ? '✓ 已复制' : '复制(纯列表)' }}
      </button>
      <button class="btn btn-sm" @click="copy('num', numbered.join('\n'))">
        {{ copiedKey === 'num' ? '✓ 已复制' : '复制(带序号)' }}
      </button>
      <button class="btn btn-sm" @click="copy('arr', JSON.stringify(output))">
        {{ copiedKey === 'arr' ? '✓ 已复制' : '复制(JSON 数组)' }}
      </button>
    </div>
  </template>
</template>

<style scoped>
.sep-input {
  width: 160px;
}
.num-input {
  width: 90px;
  margin: 0 6px;
}
</style>
