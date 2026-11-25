<script setup>
import { computed, ref } from 'vue'
import CopyButton from '@/components/CopyButton.vue'
import { chineseToNumber, numberToChinese } from '@/utils/chineseNumber'
import { shortString, useUrlState } from '@/utils/urlState'

const MODES = [
  { id: 'to-cn', label: '数字 → 中文' },
  { id: 'to-num', label: '中文 → 数字' },
]
const EXAMPLES = {
  'to-cn': ['1234', '10001', '-1024.5', '120000000', '9000000000000000'],
  'to-num': ['一百二十三', '两万零五', '十二亿三千五百万', '负三点一四', '壹仟贰佰叁拾肆'],
}

const mode = ref('to-cn')
const input = ref('1234')
useUrlState([
  { key: 'm', ref: mode, parse: (s) => (MODES.some((m) => m.id === s) ? s : undefined) },
  { key: 'q', ref: input, parse: shortString(80) },
])

const result = computed(() =>
  mode.value === 'to-cn' ? numberToChinese(input.value) : chineseToNumber(input.value),
)
const output = computed(() => (mode.value === 'to-cn' ? result.value.text : result.value.value))
const error = computed(() => result.value.error)

const label = computed(() => (mode.value === 'to-cn' ? '阿拉伯数字' : '中文数字'))
const placeholder = computed(() => (mode.value === 'to-cn' ? '如 1234.56' : '如 一百二十三'))

function setMode(id) {
  if (mode.value === id) return
  mode.value = id
  input.value = ''
}

function useExample(v) {
  input.value = v
}

function swap() {
  if (output.value && !error.value) input.value = output.value
  mode.value = mode.value === 'to-cn' ? 'to-num' : 'to-cn'
}
</script>

<template>
  <div class="row mb-14">
    <button
      v-for="m in MODES"
      :key="m.id"
      class="btn btn-sm"
      :class="{ 'btn-primary': mode === m.id }"
      @click="setMode(m.id)"
    >
      {{ m.label }}
    </button>
  </div>

  <div class="panel">
    <div class="field">
      <label class="field-label" for="cn-in">{{ label }}</label>
      <input
        id="cn-in"
        v-model="input"
        class="input mono"
        spellcheck="false"
        :placeholder="placeholder"
        autocomplete="off"
      />
    </div>

    <div class="row mt-8 row-wrap">
      <button v-for="v in EXAMPLES[mode]" :key="v" class="btn btn-sm" @click="useExample(v)">
        {{ v }}
      </button>
      <button class="btn btn-sm ml-auto" :disabled="!!error || !output" @click="swap">
        转为反向并继续 ⇄
      </button>
    </div>
  </div>

  <div v-if="error" class="error-box mt-14">✗ {{ error }}</div>
  <div v-else class="panel mt-14 result-panel">
    <div class="field-label">转换结果</div>
    <p class="result-text">{{ output || '—' }}</p>
    <div class="row mt-10">
      <CopyButton class="btn btn-sm" :text="output" label="复制结果" copied-label="✓ 已复制" />
    </div>
  </div>

  <p class="tip mt-12">
    数字转中文支持小数、负数与千分位输入,最大到 9999 京;中文转数字使用 BigInt 精确解析,
    支持 两 / 廿 / 卅、壹贰叁等大写数字与全角数字,以及「一百二 = 120」这类口语省略。
    金额票据的财务大写请用「人民币大写」。
  </p>
</template>

<style scoped>
.mono {
  font-family: var(--mono);
}
.row-wrap {
  flex-wrap: wrap;
}
.ml-auto {
  margin-left: auto;
}
.result-panel {
  border-color: var(--accent);
}
.result-text {
  font-size: 22px;
  font-weight: 600;
  line-height: 1.5;
  margin: 6px 0 0;
  word-break: break-all;
}
@media (max-width: 560px) {
  .result-text {
    font-size: 18px;
  }
  .ml-auto {
    margin-left: 0;
  }
}
</style>