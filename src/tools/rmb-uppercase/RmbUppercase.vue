<script setup>
import { ref, watch } from 'vue'
import { toChineseAmount } from '@/utils/chineseAmount'
import { useCopy } from '@/utils/useCopy'
import { useUrlState, shortString } from '@/utils/urlState'

const input = ref('1234.56')
useUrlState([
  { key: 'q', ref: input, parse: (s) => (/^[\d.,，\s]{1,20}$/.test(s) ? s : undefined) },
])
const { copiedKey, copy } = useCopy()

const result = ref({ text: '', error: '' })
watch(
  input,
  (v) => {
    result.value = toChineseAmount(v)
  },
  { immediate: true },
)

const SAMPLES = ['1234.56', '100000000001', '0.05', '10', '1005']
</script>

<template>
  <div class="field">
    <label class="field-label">数字金额(支持千分位逗号,最多两位小数,上限 9999 亿)</label>
    <input v-model="input" class="input" placeholder="如 1234.56" spellcheck="false" inputmode="decimal" />
  </div>

  <div class="row" style="margin-bottom: 14px">
    <button v-for="s in SAMPLES" :key="s" class="btn btn-sm" @click="input = s">例:{{ s }}</button>
  </div>

  <div v-if="result.error" class="error-box">✗ {{ result.error }}</div>

  <template v-else-if="result.text">
    <label class="field-label">中文大写</label>
    <pre class="output" style="font-size: 19px; letter-spacing: 1px">{{ result.text }}</pre>
    <div class="row" style="margin-top: 10px">
      <button class="btn btn-sm btn-primary" @click="copy('rmb', result.text)">
        {{ copiedKey === 'rmb' ? '✓ 已复制' : '复制大写金额' }}
      </button>
    </div>
  </template>

  <details class="panel" style="margin-top: 16px">
    <summary>📖 书写规则说明</summary>
    <p class="tip">
      按《正确填写票据和结算凭证的基本规定》:数字用零壹贰叁肆伍陆柒捌玖,位用拾佰仟万亿;
      「拾」位必须写「壹拾」;角后无分时结尾写「整」;整数与分之间有零档时补「零」(如 1.05 → 壹圆零伍分)。
      本工具不处理「元」与「圆」的票据偏好差异,统一使用「圆」。
    </p>
  </details>
</template>