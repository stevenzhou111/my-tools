<script setup>
import { computed, ref } from 'vue'
import { marginStats, priceForMargin } from '@/utils/margin'
import { useUrlState } from '@/utils/urlState'

const cost = ref(60)
const price = ref(100)
const targetRate = ref(30) // 目标毛利率(%)

const num = (lo, hi) => (s) => {
  const v = Number(s)
  return Number.isFinite(v) && v >= lo && v <= hi ? v : undefined
}
useUrlState([
  { key: 'c', ref: cost, parse: num(0, 100000000) },
  { key: 'p', ref: price, parse: num(0.01, 100000000) },
  { key: 't', ref: targetRate, parse: num(0.1, 99) },
])

const result = computed(() => {
  try {
    return { error: '', data: marginStats(cost.value, price.value) }
  } catch (e) {
    return { error: e.message, data: null }
  }
})

const suggested = computed(() => {
  try {
    return priceForMargin(cost.value, targetRate.value / 100)
  } catch {
    return null
  }
})

const pct = (v) => `${(v * 100).toFixed(1)}%`
const yuan = (v) => `¥${(+v.toFixed(2)).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`
</script>

<template>
  <div class="panel mb-16">
    <div class="form-row">
      <label class="ctrl">
        <span class="field-label m-0">成本(元)</span>
        <input v-model.number="cost" class="input num-input" type="number" min="0" step="0.01" />
      </label>
      <label class="ctrl">
        <span class="field-label m-0">售价(元)</span>
        <input v-model.number="price" class="input num-input" type="number" min="0.01" step="0.01" />
      </label>
      <label class="ctrl">
        <span class="field-label m-0">目标毛利率(%)</span>
        <input v-model.number="targetRate" class="input num-input" type="number" min="0.1" max="99" step="0.5" />
      </label>
    </div>
  </div>

  <div v-if="result.error" class="error-box mb-14">✗ {{ result.error }}</div>

  <template v-else-if="result.data">
    <div class="stat-grid">
      <div class="panel stat-card highlight">
        <div class="stat-value">{{ pct(result.data.marginRate) }}</div>
        <div class="stat-label">毛利率<span class="tip"> · 毛利 ÷ 售价</span></div>
      </div>
      <div class="panel stat-card">
        <div class="stat-value">{{ pct(result.data.markupRate) }}</div>
        <div class="stat-label">加价率<span class="tip"> · 毛利 ÷ 成本</span></div>
      </div>
      <div class="panel stat-card">
        <div class="stat-value saved">{{ yuan(result.data.profit) }}</div>
        <div class="stat-label">每件毛利<span class="tip"> · {{ yuan(price) }} − {{ yuan(cost) }}</span></div>
      </div>
    </div>

    <div class="panel mt-16">
      <p class="m-0">
        按目标毛利率 <b>{{ targetRate }}%</b> 反推:售价应定为
        <b class="accent-num">{{ suggested ? yuan(suggested) : '—' }}</b>
        <template v-if="suggested && suggested !== price">
          ,当前{{ price > suggested ? '高于' : '低于' }}建议价 {{ yuan(Math.abs(price - suggested)) }}
        </template>
      </p>
    </div>

    <div class="panel mt-16">
      <p class="tip m-0">
        毛利率与加价率是两套口径:毛利率 20% 时加价率是 25%,别混着算。
        批发报价常用加价率(成本上浮),财务报表用毛利率(占售价),本文互相换算。
        这里是毛利口径,未扣房租、人工、推广等费用;净利润要再减这些成本。
      </p>
    </div>
  </template>
</template>

<style scoped>
.form-row {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
}
.ctrl {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.num-input {
  width: 150px;
  font-family: var(--mono);
}
.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
@media (max-width: 720px) {
  .stat-grid {
    grid-template-columns: 1fr;
  }
}
.stat-card {
  text-align: center;
  padding: 18px 14px;
}
.stat-card.highlight {
  border-color: var(--accent);
}
.stat-value {
  font-family: var(--mono);
  font-size: 24px;
  font-weight: 700;
  color: var(--accent);
}
.stat-value.saved {
  color: var(--success);
}
.stat-label {
  margin-top: 4px;
  font-size: 14px;
  color: var(--muted);
}
.accent-num {
  font-family: var(--mono);
  color: var(--accent);
  font-size: 18px;
}
</style>
