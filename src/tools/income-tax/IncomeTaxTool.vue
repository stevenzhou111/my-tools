<script setup>
import { computed, ref } from 'vue'
import { annualBonusTax, salarySchedule } from '@/utils/incomeTax'

const salary = ref(10000)
const insurance = ref(0)
const special = ref(0)
const months = ref(12)
const bonus = ref(0)

const fmt = (n) => Number(n ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const result = computed(() => {
  const r = salarySchedule({ salary: salary.value, insurance: insurance.value, special: special.value, months: months.value })
  return { ...r, bonus: annualBonusTax(bonus.value) }
})
</script>

<template>
  <p class="tip" style="margin-bottom: 14px">
    按现行「累计预扣法」逐月计算工资薪金个税:累计收入 − 累计起征点(5000/月)− 个人五险一金 − 专项附加扣除后套用年度税率表,跳档月份税额会一次性升高属正常现象。
  </p>

  <div class="row" style="margin-bottom: 12px">
    <label class="ctrl">
      <span class="field-label">月薪(元)</span>
      <input v-model.number="salary" type="number" min="0" class="input" style="width: 130px" />
    </label>
    <label class="ctrl">
      <span class="field-label">个人五险一金/月</span>
      <input v-model.number="insurance" type="number" min="0" class="input" style="width: 130px" />
    </label>
    <label class="ctrl">
      <span class="field-label">专项附加扣除/月</span>
      <input v-model.number="special" type="number" min="0" class="input" style="width: 130px" />
    </label>
    <label class="ctrl">
      <span class="field-label">计算到第几月</span>
      <input v-model.number="months" type="number" min="1" max="12" class="input" style="width: 90px" />
    </label>
  </div>

  <div class="panel" style="margin-bottom: 14px">
    <div class="row">
      <strong>第 {{ months }} 月</strong>
      <span class="tip">当月预扣 <strong>{{ fmt(result.rows[months - 1]?.tax) }}</strong> 元 · 累计 {{ fmt(result.rows[months - 1]?.cumTax) }} 元 · 当月到手 {{ fmt(result.rows[months - 1]?.net) }} 元</span>
    </div>
  </div>

  <div class="table-wrap">
    <table class="tax-table">
      <thead>
        <tr>
          <th>月份</th>
          <th>当月预扣(元)</th>
          <th>累计已扣(元)</th>
          <th>当月到手(元)</th>
          <th>适用税率</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in result.rows" :key="r.month">
          <td>{{ r.month }}</td>
          <td>{{ fmt(r.tax) }}</td>
          <td>{{ fmt(r.cumTax) }}</td>
          <td>{{ fmt(r.net) }}</td>
          <td>{{ (r.rate * 100).toFixed(0) }}%</td>
        </tr>
      </tbody>
    </table>
  </div>
  <p class="tip" style="margin-top: 8px">
    {{ months }} 个月合计预扣 {{ fmt(result.totalTax) }} 元,合计到手 {{ fmt(result.totalNet) }} 元。
  </p>

  <div class="panel mt-14">
    <div class="row" style="margin-bottom: 10px">
      <label class="ctrl">
        <span class="field-label">全年一次性奖金(单独计税)</span>
        <input v-model.number="bonus" type="number" min="0" class="input" style="width: 150px" />
      </label>
    </div>
    <p v-if="bonus > 0" class="tip">
      奖金应纳个税 <strong>{{ fmt(result.bonus.tax) }}</strong> 元(税率 {{ (result.bonus.rate * 100).toFixed(0) }}%),税后 {{ fmt(result.bonus.after) }} 元。⚠️
      单独计税每个纳税年度只能用一次;奖金临界点(如 36000 → 36001)税额会跳升,发奖金前不妨先算一算。
    </p>
    <p v-else class="tip">填写奖金金额即可计算(按「奖金 ÷ 12」套用月度税率表)。</p>
  </div>
</template>

<style scoped>
.tax-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.tax-table th,
.tax-table td {
  border: 1px solid var(--border);
  padding: 6px 10px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.tax-table th:first-child,
.tax-table td:first-child {
  text-align: center;
}
.tax-table thead th {
  background: var(--bg-soft);
  position: sticky;
  top: 0;
}
</style>
