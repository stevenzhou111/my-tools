<script setup>
import { computed, ref } from 'vue'
import { plan } from '@/utils/compound'

const principal = ref(100000)
const monthly = ref(2000)
const ratePct = ref(3)
const years = ref(10)

const fmt = (n) => Number(n ?? 0).toLocaleString('zh-CN', { maximumFractionDigits: 0 })

const result = computed(() =>
  plan({ principal: principal.value, monthly: monthly.value, annualRate: ratePct.value / 100, years: years.value }),
)
</script>

<template>
  <p class="tip" style="margin-bottom: 14px">
    复利终值 = 本金 × (1 + 年利率)^年限;定投按「期末普通年金」按月复利。名义收益口径,未计入通胀与申赎费用;收益率为假设值,不代表任何真实产品收益。
  </p>

  <div class="row" style="margin-bottom: 12px">
    <label class="ctrl">
      <span class="field-label">现有本金(元)</span>
      <input v-model.number="principal" type="number" min="0" class="input" style="width: 130px" />
    </label>
    <label class="ctrl">
      <span class="field-label">每月定投(元)</span>
      <input v-model.number="monthly" type="number" min="0" class="input" style="width: 130px" />
    </label>
    <label class="ctrl">
      <span class="field-label">年化收益率(%)</span>
      <input v-model.number="ratePct" type="number" min="-10" max="30" step="0.5" class="input" style="width: 110px" />
    </label>
    <label class="ctrl">
      <span class="field-label">投资年限</span>
      <input v-model.number="years" type="number" min="1" max="50" class="input" style="width: 90px" />
    </label>
  </div>

  <div class="panel">
    <div class="row" style="flex-wrap: wrap; gap: 18px">
      <span>累计投入 <strong>{{ fmt(result.totalInvested) }}</strong> 元</span>
      <span>期末总额 <strong>{{ fmt(result.totalFV) }}</strong> 元</span>
      <span>其中收益 <strong>{{ fmt(result.totalInterest) }}</strong> 元(占期末总额 {{ ((result.totalInterest / result.totalFV) * 100 || 0).toFixed(1) }}%)</span>
    </div>
  </div>

  <div class="table-wrap">
    <table class="plan-table">
      <thead>
        <tr>
          <th>年末</th>
          <th>累计投入(元)</th>
          <th>账户终值(元)</th>
          <th>累计收益(元)</th>
          <th>收益/本金</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in result.rows" :key="r.year">
          <td>{{ r.year }}</td>
          <td>{{ fmt(r.invested) }}</td>
          <td>{{ fmt(r.fv) }}</td>
          <td>{{ fmt(r.interest) }}</td>
          <td>{{ ((r.interest / r.invested) * 100).toFixed(1) }}%</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.plan-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.plan-table th,
.plan-table td {
  border: 1px solid var(--border);
  padding: 6px 10px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.plan-table th:first-child,
.plan-table td:first-child {
  text-align: center;
}
.plan-table thead th {
  background: var(--bg-soft);
  position: sticky;
  top: 0;
}
</style>
