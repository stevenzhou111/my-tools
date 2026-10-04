<script setup>
import { computed, ref } from 'vue'
import { combineLoans, loanSchedule, yearlySummary } from '@/utils/mortgage'
import { useUrlState } from '@/utils/urlState'

const method = ref('annuity')
const amount1 = ref(100)
const rate1 = ref(3.1)
const years1 = ref(30)
const useFund = ref(false)
const amount2 = ref(40)
const rate2 = ref(2.85)
const years2 = ref(25)

const num = (min, max) => (s) => {
  const v = Number(s)
  return Number.isFinite(v) && v >= min && v <= max ? v : undefined
}
useUrlState([
  { key: 'm', ref: method, parse: (s) => (s === 'a' || s === 'p' ? s : undefined) },
  { key: 'a1', ref: amount1, parse: num(1, 100000) },
  { key: 'r1', ref: rate1, parse: num(0.01, 36) },
  { key: 'y1', ref: years1, parse: num(1, 50) },
  { key: 'g', ref: useFund, parse: (s) => (s === '1' ? true : s === '0' ? false : undefined) },
  { key: 'a2', ref: amount2, parse: num(1, 100000) },
  { key: 'r2', ref: rate2, parse: num(0.01, 36) },
  { key: 'y2', ref: years2, parse: num(1, 50) },
])

// 两种还款方式都算一遍,用于展示对比;单笔贷款也走 combineLoans 保持口径一致
function build(m) {
  const loans = [{ principal: amount1.value * 10000, annualRate: rate1.value / 100, months: years1.value * 12, method: m }]
  if (useFund.value) {
    loans.push({ principal: amount2.value * 10000, annualRate: rate2.value / 100, months: years2.value * 12, method: m })
  }
  return combineLoans(loans.map((l) => loanSchedule(l)))
}

const result = computed(() => {
  try {
    const annuity = build('annuity')
    const principal = build('principal')
    return { error: '', annuity, principal, current: method.value === 'annuity' ? annuity : principal }
  } catch (e) {
    return { error: e.message, annuity: null, principal: null, current: null }
  }
})

const years = computed(() => yearlySummary(result.value.current?.rows ?? []))

const fmt = (n) => Number(n).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtWan = (n) => fmt(n / 10000)

const cards = computed(() => {
  const c = result.value.current
  if (!c) return []
  const list = [
    { label: method.value === 'annuity' ? '每月月供' : '首月月供', value: `${fmt(c.firstPayment)} 元`, strong: true },
  ]
  if (method.value === 'principal') list.push({ label: '末月月供', value: `${fmt(c.lastPayment)} 元` })
  list.push(
    { label: '支付利息总额', value: `${fmtWan(c.totalInterest)} 万` },
    { label: '还款总额', value: `${fmtWan(c.totalPayment)} 万` },
    { label: '贷款总额', value: `${fmtWan(c.totalPrincipal)} 万` },
  )
  return list
})
</script>

<template>
  <div class="field">
    <span class="field-label">还款方式</span>
    <div class="row" role="radiogroup" aria-label="还款方式">
      <button
        class="btn"
        :class="{ 'btn-primary': method === 'annuity' }"
        role="radio"
        :aria-checked="method === 'annuity'"
        @click="method = 'annuity'"
      >
        等额本息(月供固定)
      </button>
      <button
        class="btn"
        :class="{ 'btn-primary': method === 'principal' }"
        role="radio"
        :aria-checked="method === 'principal'"
        @click="method = 'principal'"
      >
        等额本金(月供递减)
      </button>
    </div>
  </div>

  <div class="grid-2">
    <div class="panel loan-panel">
      <h3 style="font-size: 16px">💳 商业贷款</h3>
      <div class="field">
        <label class="field-label" for="m-a1">贷款金额(万)</label>
        <input id="m-a1" v-model.number="amount1" class="input" type="number" min="1" max="100000" step="1" />
      </div>
      <div class="field">
        <label class="field-label" for="m-r1">年利率(%)</label>
        <input id="m-r1" v-model.number="rate1" class="input" type="number" min="0.01" max="36" step="0.01" />
      </div>
      <div class="field">
        <label class="field-label" for="m-y1">期限(年)</label>
        <input id="m-y1" v-model.number="years1" class="input" type="number" min="1" max="50" step="1" />
      </div>
    </div>

    <div class="panel loan-panel" :class="{ dim: !useFund }">
      <label class="check" style="margin-bottom: 12px">
        <input v-model="useFund" type="checkbox" />
        <h3 style="font-size: 16px; user-select: none">🏛️ 公积金贷款(可选)</h3>
      </label>
      <template v-if="useFund">
        <div class="field">
          <label class="field-label" for="m-a2">贷款金额(万)</label>
          <input id="m-a2" v-model.number="amount2" class="input" type="number" min="1" max="100000" step="1" />
        </div>
        <div class="field">
          <label class="field-label" for="m-r2">年利率(%)</label>
          <input id="m-r2" v-model.number="rate2" class="input" type="number" min="0.01" max="36" step="0.01" />
        </div>
        <div class="field">
          <label class="field-label" for="m-y2">期限(年)</label>
          <input id="m-y2" v-model.number="years2" class="input" type="number" min="1" max="50" step="1" />
        </div>
      </template>
      <p v-else class="tip">勾选后填写公积金贷款部分,两笔贷款按月合并计算月供。</p>
    </div>
  </div>

  <div v-if="result.error" class="error-box" style="margin-top: 14px">✗ {{ result.error }}</div>

  <template v-else>
    <div class="stat-grid" style="margin-top: 16px">
      <div v-for="c in cards" :key="c.label" class="panel stat-card">
        <div class="stat-value" :class="{ strong: c.strong }">{{ c.value }}</div>
        <div class="stat-label">{{ c.label }}</div>
      </div>
    </div>

    <p class="tip" style="margin-top: 14px">
      <template v-if="method === 'annuity'">
        当前是等额本息:每月还款额固定、好规划;换成
        <a href="#" @click.prevent="method = 'principal'">等额本金</a>
        总利息可少 {{
          fmt(result.annuity.totalInterest - result.principal.totalInterest)
        }}
        元,但首月月供要多还 {{ fmt(result.principal.firstPayment - result.annuity.firstPayment) }} 元。
      </template>
      <template v-else>
        当前是等额本金:首月压力最大、之后逐月递减;总利息比
        <a href="#" @click.prevent="method = 'annuity'">等额本息</a>
        少 {{ fmt(result.annuity.totalInterest - result.principal.totalInterest) }} 元。
      </template>
    </p>

    <details class="panel" style="margin-top: 14px">
      <summary>📅 按年还款明细({{ years.length }} 年)</summary>
      <div class="table-wrap">
        <table class="year-table">
          <thead>
            <tr>
              <th>年份</th>
              <th>还款额(元)</th>
              <th>其中本金</th>
              <th>其中利息</th>
              <th>年末剩余本金(万)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="y in years" :key="y.year">
              <td>第 {{ y.year }} 年</td>
              <td>{{ fmt(y.payment) }}</td>
              <td>{{ fmt(y.principal) }}</td>
              <td>{{ fmt(y.interest) }}</td>
              <td>{{ fmtWan(y.balance) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </details>

    <p class="tip" style="margin-top: 12px">
      计算完全在本地完成;利率与额度请以银行 / 公积金中心实际审批为准,结果仅供参考。
      分享本页链接会带上你填写的金额与利率(不含其他隐私)。
    </p>
  </template>
</template>

<style scoped>
.loan-panel.dim {
  opacity: 0.55;
}
.loan-panel h3 {
  margin: 0;
}
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}
.stat-card {
  padding: 14px 16px;
  text-align: center;
}
.stat-value {
  font-family: var(--mono);
  font-size: 20px;
  font-weight: 700;
  word-break: break-all;
}
.stat-value.strong {
  font-size: 26px;
  color: var(--accent);
}
.stat-label {
  margin-top: 4px;
  font-size: 13.5px;
  color: var(--muted);
}
.table-wrap {
  max-height: 380px;
  overflow: auto;
  margin-top: 10px;
}
.year-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  font-family: var(--mono);
}
.year-table th,
.year-table td {
  padding: 7px 10px;
  border-bottom: 1px solid var(--border);
  text-align: right;
  white-space: nowrap;
}
.year-table th:first-child,
.year-table td:first-child {
  text-align: left;
  font-family: inherit;
}
.year-table th {
  position: sticky;
  top: 0;
  background: var(--card);
  color: var(--muted);
  font-weight: 600;
}
</style>
