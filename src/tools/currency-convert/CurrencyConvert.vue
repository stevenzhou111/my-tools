<script setup>
import { computed, onMounted, ref } from 'vue'
import { CURRENCIES, CURRENCY_NAMES, getRates, convert, rateText, formatMoney } from '@/utils/currency'
import { useCopy } from '@/utils/useCopy'
import { useUrlState, shortString } from '@/utils/urlState'
import AppIcon from '@/components/AppIcon.vue'

const amount = ref(100)
const from = ref('USD')
const to = ref('CNY')
const loading = ref(false)
const data = ref(null) // { rates, date, fetchedAt, stale, fromCache, error }
const { copiedKey, copy } = useCopy()

const num = (lo, hi) => (s) => {
  const v = Number(s)
  return Number.isFinite(v) && v >= lo && v <= hi ? v : undefined
}
useUrlState([
  { key: 'a', ref: amount, parse: num(0.01, 1e12) },
  { key: 'f', ref: from, parse: (s) => (CURRENCIES.some((c) => c.code === s) ? s : undefined) },
  { key: 't', ref: to, parse: (s) => (CURRENCIES.some((c) => c.code === s) ? s : undefined) },
])

const POPULAR = ['CNY', 'USD', 'EUR', 'JPY', 'GBP', 'HKD', 'KRW', 'SGD']

async function load(force = false) {
  loading.value = true
  data.value = await getRates({ force })
  loading.value = false
}
onMounted(() => load())

const result = computed(() => {
  if (!data.value?.rates) return null
  return convert(amount.value, data.value.rates, from.value, to.value)
})

const directRate = computed(() => (data.value?.rates ? rateText(data.value.rates, from.value, to.value) : ''))
const inverseRate = computed(() => (data.value?.rates ? rateText(data.value.rates, to.value, from.value) : ''))

const popularRows = computed(() => {
  if (!data.value?.rates) return []
  return POPULAR.filter((c) => c !== from.value).map((c) => ({
    code: c,
    name: CURRENCY_NAMES[c],
    value: convert(amount.value, data.value.rates, from.value, c),
  }))
})

const cacheAgeText = computed(() => {
  if (!data.value?.fetchedAt) return ''
  const mins = Math.max(0, Math.round((Date.now() - data.value.fetchedAt) / 60000))
  return mins < 60 ? `${mins} 分钟前` : `${Math.round(mins / 60)} 小时前`
})

function swap() {
  ;[from.value, to.value] = [to.value, from.value]
}
</script>

<template>
  <div class="online-banner panel mb-16">
    <AppIcon name="wifi" :size="15" />
    <span>本工具需要联网获取汇率(欧洲央行参考汇率,工作日更新);无密钥、不收集任何数据。</span>
  </div>

  <div class="panel mb-16">
    <div class="form-row">
      <label class="ctrl grow">
        <span class="field-label m-0">金额</span>
        <input v-model.number="amount" class="input amount-input" type="number" min="0.01" step="any" />
      </label>
      <label class="ctrl">
        <span class="field-label m-0">从</span>
        <select v-model="from" class="select cur-select">
          <option v-for="c in CURRENCIES" :key="c.code" :value="c.code">{{ c.code }} · {{ c.name }}</option>
        </select>
      </label>
      <button class="btn swap-btn self-end" title="交换两个货币" aria-label="交换货币" @click="swap">
        <AppIcon name="arrow-left-right" :size="16" />
      </button>
      <label class="ctrl">
        <span class="field-label m-0">到</span>
        <select v-model="to" class="select cur-select">
          <option v-for="c in CURRENCIES" :key="c.code" :value="c.code">{{ c.code }} · {{ c.name }}</option>
        </select>
      </label>
      <button class="btn btn-primary self-end" :disabled="loading" @click="load(true)">
        <AppIcon :name="loading ? 'loader' : 'refresh-cw'" :size="14" />{{ loading ? '获取中' : '刷新汇率' }}
      </button>
    </div>
  </div>

  <div v-if="data?.error" class="error-box mb-14">
    ✗ {{ data.error }}
    <button class="btn btn-sm retry-btn" @click="load(true)">重试</button>
  </div>

  <template v-if="result !== null">
    <div class="panel result-panel mb-16">
      <div class="result-row">
        <span class="result-amount">{{ formatMoney(amount, from) }} {{ from }}</span>
        <AppIcon name="arrow-right" :size="22" class="result-arrow" />
        <span class="result-amount target">{{ formatMoney(result, to) }} {{ to }}</span>
        <button class="btn btn-sm" @click="copy('cur', formatMoney(result, to))">
          <AppIcon :name="copiedKey === 'cur' ? 'check' : 'clipboard'" :size="13" />{{ copiedKey === 'cur' ? '已复制' : '复制' }}
        </button>
      </div>
      <p class="tip m-0 mt-8">
        1 {{ from }}({{ CURRENCY_NAMES[from] }})= {{ directRate }} {{ to }} ·
        1 {{ to }} = {{ inverseRate }} {{ from }}
        <template v-if="data?.date">· 数据日期 {{ data.date }}</template>
      </p>
      <p v-if="data?.stale" class="tip stale-tip m-0 mt-4">
        ⚠ 当前为缓存数据(获取于 {{ cacheAgeText }}),网络恢复后点「刷新汇率」更新。
      </p>
      <p v-else-if="data" class="tip m-0 mt-4">数据{{ data.fromCache ? `来自本地缓存(${cacheAgeText}获取)` : '刚从汇率服务获取' }}</p>
    </div>

    <div class="panel">
      <p class="m-0 mb-10"><b>{{ formatMoney(amount, from) }} {{ from }}({{ CURRENCY_NAMES[from] }})≈</b></p>
      <div class="pop-grid">
        <button v-for="row in popularRows" :key="row.code" type="button" class="pop-item" :title="`复制 ${row.value}`" @click="copy(`pop-${row.code}`, formatMoney(row.value, row.code))">
          <span class="pop-cur">{{ row.code }}</span>
          <span class="pop-val">{{ formatMoney(row.value, row.code) }}</span>
          <span class="pop-name">{{ row.name }}<AppIcon :name="copiedKey === `pop-${row.code}` ? 'check' : 'clipboard'" :size="11" /></span>
        </button>
      </div>
    </div>
  </template>

  <div class="panel mt-16">
    <p class="tip m-0">
      数据来源为欧洲央行参考汇率(frankfurter.app 转发),覆盖 31 种货币,工作日更新、周末沿用最近一个交易日的牌价;
      与银行柜台价/现汇价有买卖价差,大额换汇以银行实价为准。本站不存储任何查询记录。
    </p>
  </div>
</template>

<style scoped>
.online-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
  color: var(--muted);
  padding: 10px 16px;
  border-color: color-mix(in srgb, var(--warning) 35%, var(--border));
}
.form-row {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  align-items: flex-end;
}
.ctrl {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.grow {
  flex: 1;
  min-width: 140px;
}
.amount-input {
  font-family: var(--mono);
  font-size: 17px;
}
.cur-select {
  min-width: 150px;
}
.swap-btn {
  height: 40px;
  width: 40px;
  display: grid;
  place-items: center;
  padding: 0;
}
.retry-btn {
  margin-left: 10px;
}
.result-panel {
  border-color: color-mix(in srgb, var(--accent) 40%, var(--border));
}
.result-row {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}
.result-amount {
  font-family: var(--mono);
  font-size: 24px;
  font-weight: 700;
}
.result-amount.target {
  color: var(--accent);
  font-size: 30px;
}
.result-arrow {
  color: var(--muted);
}
.stale-tip {
  color: var(--warning);
}
.pop-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 8px;
}
.pop-item {
  display: flex;
  align-items: baseline;
  gap: 8px;
  background: var(--bg-soft);
  border: none;
  border-radius: 10px;
  padding: 9px 12px;
  cursor: pointer;
  text-align: left;
  color: var(--text);
}
.pop-item:hover {
  background: var(--accent-soft);
}
.pop-cur {
  font-family: var(--mono);
  font-weight: 700;
  color: var(--accent);
  flex-shrink: 0;
}
.pop-val {
  font-family: var(--mono);
  font-weight: 600;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pop-name {
  font-size: 12px;
  color: var(--muted);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.mt-4 {
  margin-top: 4px !important;
}
</style>
