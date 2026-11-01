<script setup>
import { computed, ref } from 'vue'
import { evalSci } from '@/utils/sciExpression'
import { useCopy } from '@/utils/useCopy'

const input = ref('sin(30) + sqrt(2)^2')
const degrees = ref(true)
const { copiedKey, copy } = useCopy()

// 计算历史:localStorage 持久,最近 30 条,点击回填表达式
const HISTORY_KEY = 'toolbox-sci-calc-history'
function loadHistory() {
  try {
    const v = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
    return Array.isArray(v) ? v.slice(0, 30) : []
  } catch {
    return []
  }
}
const history = ref(loadHistory())

const result = computed(() => {
  const r = evalSci(input.value, { degrees: degrees.value })
  if (r.value === null) return null
  return Number(r.value.toPrecision(12)).toLocaleString('zh-CN', { maximumFractionDigits: 10 })
})

// 输入变化时,若与历史末条相同则不重复记录
let lastRecorded = ''
function record() {
  const expr = input.value.trim()
  if (!expr || !result.value || expr === lastRecorded) return
  lastRecorded = expr
  if (history.value[0]?.expr === expr && history.value[0]?.res === result.value) return
  history.value = [{ expr, res: result.value, degrees: degrees.value }, ...history.value].slice(0, 30)
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.value))
  } catch { /* 存储不可用时静默跳过 */ }
}

function recall(item) {
  input.value = item.expr
  degrees.value = item.degrees
}

function clearHistory() {
  history.value = []
  lastRecorded = ''
  try {
    localStorage.removeItem(HISTORY_KEY)
  } catch { /* 静默 */ }
}

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
    <label class="field-label" for="sci-in">表达式(按 Enter 记入历史)</label>
    <input id="sci-in" v-model="input" class="input mono" style="font-family: var(--mono); font-size: 16px" spellcheck="false" placeholder="如 sin(30)^2 + ln(e)" @keydown.enter="record" @blur="record" />
  </div>

  <div class="keypad">
    <button v-for="k in KEYS" :key="k" class="btn btn-sm" type="button" @click="insert(k); record()">{{ k.replace('(', '') }}</button>
  </div>

  <div class="panel sci-result">
    <span class="tip">结果</span>
    <strong v-if="result !== null" class="sci-value">{{ result }}</strong>
    <span v-else class="tip">(无法求值:检查括号配对、函数名与除零)</span>
    <button v-if="result !== null" class="btn btn-sm" @click="copy('sci', String(result))">{{ copiedKey === 'sci' ? '✓ 已复制' : '复制' }}</button>
  </div>

  <details v-if="history.length" class="panel hist-panel">
    <summary>计算历史({{ history.length }} 条,存本机)</summary>
    <div class="hist-list">
      <button v-for="(h, i) in history" :key="i" class="hist-item" :title="'点击回填:' + h.expr" @click="recall(h)">
        <span class="hist-expr">{{ h.expr }}<template v-if="!h.degrees"> (rad)</template></span>
        <span class="hist-res">= {{ h.res }}</span>
      </button>
    </div>
    <div class="row mt-8">
      <button class="btn btn-sm" @click="clearHistory">清空历史</button>
    </div>
  </details>
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
.hist-panel {
  margin-top: 12px;
  padding: 12px 18px;
}
.hist-panel summary {
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  color: var(--muted);
  user-select: none;
}
.hist-list {
  display: flex;
  flex-direction: column;
  margin-top: 8px;
}
.hist-item {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  width: 100%;
  text-align: left;
  padding: 7px 10px;
  border: none;
  background: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  color: var(--text);
}
.hist-item:hover {
  background: var(--accent-soft);
}
.hist-expr {
  font-family: var(--mono);
  word-break: break-all;
}
.hist-res {
  font-family: var(--mono);
  font-weight: 700;
  color: var(--accent-strong);
  white-space: nowrap;
}
</style>
