<script setup>
import { computed, ref } from 'vue'
import { convertRate } from '@/utils/rate'
import { useUrlState } from '@/utils/urlState'

const value = ref(0.05)
const from = ref('daily')
const compound = ref(false)

const num = (lo, hi) => (s) => {
  const v = Number(s)
  return Number.isFinite(v) && v >= lo && v <= hi ? v : undefined
}
useUrlState([
  { key: 'v', ref: value, parse: num(0, 10000) },
  { key: 'f', ref: from, parse: (s) => (['daily', 'monthly', 'annual'].includes(s) ? s : undefined) },
  { key: 'c', ref: compound, parse: (s) => (s === '1' ? true : s === '0' ? false : undefined) },
])

const FROM_ITEMS = [
  { id: 'daily', label: '日利率' },
  { id: 'monthly', label: '月利率' },
  { id: 'annual', label: '年利率' },
]

const QUICK = [
  { label: '万1', v: 0.01 },
  { label: '万5', v: 0.05 },
  { label: '千1', v: 0.1 },
  { label: '1分(月)', v: 1 },
]

const result = computed(() => {
  try {
    return { error: '', data: convertRate(value.value, from.value, compound.value) }
  } catch {
    return { error: '请输入 0~10000 之间的利率(百分数)', data: null }
  }
})

const CARDS = [
  { key: 'daily', label: '日利率', note: '按 365 天' },
  { key: 'monthly', label: '月利率', note: '按 12 个月' },
  { key: 'annual', label: '年利率', note: '监管要求展示口径' },
]

// 万几日息的常用口头表述
const wanCi = computed(() => {
  if (!result.value.data) return ''
  const d = result.value.data.daily
  const wan = d / 0.01 // 1 个「万」= 0.01%
  if (wan >= 0.2 && wan <= 20) return `日息约万 ${+wan.toFixed(2)}`
  return ''
})
</script>

<template>
  <div class="panel" style="margin-bottom: 16px">
    <div class="row">
      <label class="ctrl">
        <span class="field-label" style="margin: 0">利率数值(%)</span>
        <input v-model.number="value" class="input rate-input" type="number" min="0" step="0.01" />
      </label>
      <div class="ctrl" role="radiogroup" aria-label="利率类型">
        <span class="field-label" style="margin: 0">类型</span>
        <div class="row" style="gap: 6px">
          <button
            v-for="f in FROM_ITEMS"
            :key="f.id"
            class="btn btn-sm"
            :class="{ 'btn-primary': from === f.id }"
            role="radio"
            :aria-checked="from === f.id"
            @click="from = f.id"
          >
            {{ f.label }}
          </button>
        </div>
      </div>
      <label class="ctrl" style="justify-content: flex-end">
        <span class="field-label" style="margin: 0">计息口径</span>
        <label class="check"><input v-model="compound" type="checkbox" />复利(利滚利)</label>
      </label>
    </div>
    <div class="row" style="margin-top: 10px">
      <span class="tip">常用:</span>
      <button v-for="q in QUICK" :key="q.label" class="btn btn-sm" @click="value = q.v; from = q.v >= 1 ? 'monthly' : 'daily'">
        {{ q.label }}
      </button>
      <span v-if="wanCi" class="chip-wan">{{ wanCi }}</span>
    </div>
  </div>

  <div v-if="result.error" class="error-box" style="margin-bottom: 14px">✗ {{ result.error }}</div>

  <div v-else-if="result.data" class="stat-grid">
    <div v-for="c in CARDS" :key="c.key" class="panel stat-card" :class="{ active: from === c.key }">
      <div class="stat-value">{{ +result.data[c.key].toFixed(4) }}%</div>
      <div class="stat-label">{{ c.label }}<span class="tip"> · {{ c.note }}</span></div>
    </div>
  </div>

  <div v-if="result.data" class="panel" style="margin-top: 16px">
    <p class="tip" style="margin: 0">
      <template v-if="!compound">
        单利口径:年利率 = 日利率 × 365 = 月利率 × 12。例:日息万 5(0.05%)即年化 18.25%。
      </template>
      <template v-else>
        复利口径:年利率 = (1 + 日利率)<sup>365</sup> − 1,比单利更高;信用卡循环、部分网贷按此计息。
      </template>
      借贷时请以合同展示的<b>年化利率(APR)</b>为准,只看「日息万几」很容易低估真实成本。
    </p>
  </div>
</template>

<style scoped>
.ctrl {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.rate-input {
  width: 150px;
  font-family: var(--mono);
}
.chip-wan {
  font-size: 14px;
  padding: 3px 12px;
  border-radius: 20px;
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
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
.stat-card.active {
  border-color: var(--accent);
}
.stat-value {
  font-family: var(--mono);
  font-size: 24px;
  font-weight: 700;
  color: var(--accent);
}
.stat-label {
  margin-top: 4px;
  font-size: 14px;
  color: var(--muted);
}
</style>
