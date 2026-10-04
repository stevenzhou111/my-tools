<script setup>
import { computed, ref } from 'vue'
import { numberLines, removeEmpty, sortLines, splitLines, trimLines, uniqueLines } from '@/utils/lines'
import { useCopy } from '@/utils/useCopy'
import { useUrlState } from '@/utils/urlState'

const text = ref('')
const mode = ref('alpha')
const reverse = ref(false)
const dedupe = ref(false)
const dropEmpty = ref(false)
const trim = ref(false)
const numbering = ref(false)
const numStart = ref(1)
const numPad = ref(false)

// 行内容不进 URL,只同步操作开关
const flag = (key, refVal) => ({
  key,
  ref: refVal,
  parse: (s) => (s === '1' ? true : s === '0' ? false : undefined),
})
useUrlState([
  { key: 'm', ref: mode, parse: (s) => (['alpha', 'numeric', 'length', 'random'].includes(s) ? s : undefined) },
  flag('r', reverse),
  flag('d', dedupe),
  flag('e', dropEmpty),
  flag('t', trim),
  flag('n', numbering),
])

const { copiedKey, copy } = useCopy()

const MODES = [
  { id: 'alpha', label: '字母序' },
  { id: 'numeric', label: '数字序' },
  { id: 'length', label: '按长度' },
  { id: 'random', label: '随机打乱' },
]

const output = computed(() => {
  if (!text.value) return ''
  let lines = splitLines(text.value)
  if (trim.value) lines = trimLines(lines)
  if (dropEmpty.value) lines = removeEmpty(lines)
  lines = sortLines(lines, mode.value, reverse.value)
  if (dedupe.value) lines = uniqueLines(lines)
  if (numbering.value) lines = numberLines(lines, Number(numStart) >= 0 ? Math.floor(Number(numStart) || 1) : 1, numPad.value)
  return lines.join('\n')
})
const changed = computed(() => output.value !== text.value)

const SAMPLE = `香蕉
apple
10. 半价
Apple
2. 优先
carrot
香蕉
  `

function applyPreset(name) {
  if (name === 'dedupe-sort') {
    mode.value = 'alpha'
    dedupe.value = true
    dropEmpty.value = true
    trim.value = true
  }
}
</script>

<template>
  <div class="field">
    <label class="field-label" for="sort-in">原文(每行一条)</label>
    <textarea id="sort-in" v-model="text" class="textarea" style="min-height: 160px" placeholder="粘贴多行文本,如名单、清单、日志…" spellcheck="false"></textarea>
    <div class="row" style="margin-top: 8px">
      <button class="btn btn-sm" @click="text = SAMPLE">填入示例</button>
      <button class="btn btn-sm" :disabled="!text" @click="text = ''">清空</button>
    </div>
  </div>

  <div class="panel" style="margin-bottom: 16px">
    <span class="field-label">操作(自上而下依次生效)</span>
    <div class="row" style="margin-bottom: 10px" role="radiogroup" aria-label="排序方式">
      <button
        v-for="m in MODES"
        :key="m.id"
        class="btn btn-sm"
        :class="{ 'btn-primary': mode === m.id }"
        role="radio"
        :aria-checked="mode === m.id"
        @click="mode = m.id"
      >
        {{ m.label }}
      </button>
      <label class="check" :class="{ dim: mode === 'random' }">
        <input v-model="reverse" type="checkbox" :disabled="mode === 'random'" />
        反转(降序)
      </label>
    </div>
    <div class="row">
      <label class="check"><input v-model="dedupe" type="checkbox" />去重(忽略首尾空白)</label>
      <label class="check"><input v-model="dropEmpty" type="checkbox" />去掉空行</label>
      <label class="check"><input v-model="trim" type="checkbox" />行首尾去空白</label>
      <label class="check"><input v-model="numbering" type="checkbox" />加行号</label>
      <template v-if="numbering">
        <label class="check" style="gap: 5px">
          起始
          <input v-model.number="numStart" type="number" min="0" max="9999" class="input num-start" aria-label="起始编号" />
        </label>
        <label class="check"><input v-model="numPad" type="checkbox" />补零对齐</label>
      </template>
    </div>
    <div class="row" style="margin-top: 10px">
      <button class="btn btn-sm" @click="applyPreset('dedupe-sort')">一键:排序 + 去重 + 去空行</button>
    </div>
  </div>

  <div class="field">
    <label class="field-label" for="sort-out">
      结果
      <span v-if="text" class="tip">{{ changed ? '已整理' : '没有变化' }}</span>
    </label>
    <textarea id="sort-out" class="textarea" style="min-height: 160px" readonly :value="output" placeholder="结果实时生成…"></textarea>
    <div class="row" style="margin-top: 10px">
      <button class="btn btn-sm btn-primary" :disabled="!output" @click="copy('sort', output)">
        {{ copiedKey === 'sort' ? '✓ 已复制' : '复制结果' }}
      </button>
      <button v-if="output" class="btn btn-sm" @click="text = output">↑ 用结果覆盖原文(可叠加处理)</button>
    </div>
  </div>

  <details class="panel">
    <summary>📖 操作说明</summary>
    <p class="tip">
      字母序对中英文混排按本地化规则排序、忽略大小写;数字序按「行首数字」的数值排(2 排在 10 前面),没有数字的行排到最后;
      随机打乱用加密级随机数,适合抽签定顺序。操作按开关顺序依次执行:去空白 → 去空行 → 排序 → 去重 → 加行号。
      正文不会写入地址栏,分享链接只携带整理选项。
    </p>
  </details>
</template>

<style scoped>
.dim {
  opacity: 0.5;
}
.num-start {
  width: 74px;
  padding: 4px 8px;
}
</style>
