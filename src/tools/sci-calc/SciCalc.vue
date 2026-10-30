<script setup>
import { computed, ref } from 'vue'
import { evalSci } from '@/utils/sciExpression'
import { useCopy } from '@/utils/useCopy'

const input = ref('sin(30) + sqrt(2)^2')
const degrees = ref(true)
const { copiedKey, copy } = useCopy()

const result = computed(() => {
  const r = evalSci(input.value, { degrees: degrees.value })
  if (r.value === null) return null
  return Number(r.value.toPrecision(12)).toLocaleString('zh-CN', { maximumFractionDigits: 10 })
})

const KEYS = ['sin(', 'cos(', 'tan(', 'asin(', 'acos(', 'atan(', 'sqrt(', 'ln(', 'log(', 'exp(', 'abs(', 'round(', 'floor(', 'ceil(', 'pi', 'e', '^', '(', ')']

function insert(k) {
  input.value += k
}
</script>

<template>
  <p class="tip" style="margin-bottom: 14px">
    支持三角/反三角(角度制与弧度制可切)、sqrt/ln/log/exp/abs/取整、常数 pi 与 e、右结合幂运算 <code>^</code>。除零、开负平方根等无意义运算返回空而非报错。
  </p>

  <div class="row" style="margin-bottom: 12px">
    <label class="check"><input v-model="degrees" type="radio" :value="true" />角度制(°)</label>
    <label class="check"><input v-model="degrees" type="radio" :value="false" />弧度制(rad)</label>
  </div>

  <div class="field">
    <label class="field-label" for="sci-in">表达式</label>
    <input id="sci-in" v-model="input" class="input mono" style="font-family: var(--mono); font-size: 16px" spellcheck="false" placeholder="如 sin(30)^2 + ln(e)" />
  </div>

  <div class="keypad">
    <button v-for="k in KEYS" :key="k" class="btn btn-sm" type="button" @click="insert(k)">{{ k.replace('(', '') }}</button>
  </div>

  <div class="panel sci-result">
    <span class="tip">结果</span>
    <strong v-if="result !== null" class="sci-value">{{ result }}</strong>
    <span v-else class="tip">(无法求值:检查括号配对、函数名与除零)</span>
    <button v-if="result !== null" class="btn btn-sm" @click="copy('sci', String(result))">{{ copiedKey === 'sci' ? '✓ 已复制' : '复制' }}</button>
  </div>
</template>

<style scoped>
.keypad {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 12px 0;
}
.sci-result {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 12px;
}
.sci-value {
  font-family: var(--mono);
  font-size: 26px;
  color: var(--accent-strong);
  word-break: break-all;
}
</style>
