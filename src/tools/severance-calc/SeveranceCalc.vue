<script setup>
import { computed, ref } from 'vue'
import { severance } from '@/utils/severance'
import { useUrlState } from '@/utils/urlState'
import AppIcon from '@/components/AppIcon.vue'

const start = ref('2020-03-01')
const end = ref('')
const wage = ref(15000)
const socialAvg = ref('')
const withNotice = ref(false)

const dateStr = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(s || '') ? s : undefined)
const num = (lo, hi) => (s) => {
  const v = Number(s)
  return Number.isFinite(v) && v >= lo && v <= hi ? v : undefined
}
useUrlState([
  { key: 's', ref: start, parse: dateStr },
  { key: 'e', ref: end, parse: dateStr },
  { key: 'w', ref: wage, parse: num(1, 10000000) },
  { key: 'cap', ref: socialAvg, parse: (s) => (s === '' ? '' : num(0, 1000000)(s)) },
])

const today = new Date()
const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

const result = computed(() => {
  if (!end.value) return { error: '', data: null }
  return severance({ start: start.value, end: end.value, wage: wage.value, socialAvg: socialAvg.value === '' ? 0 : socialAvg.value, withNotice: withNotice.value })
})

const yuan = (v) => `¥${(+Number(v).toFixed(2)).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`
</script>

<template>
  <div class="panel mb-16">
    <div class="form-row">
      <label class="ctrl">
        <span class="field-label m-0">入职日期</span>
        <input v-model="start" class="input date-input" type="date" />
      </label>
      <label class="ctrl">
        <span class="field-label m-0">离职日期</span>
        <input v-model="end" class="input date-input" type="date" :max="todayStr" />
      </label>
      <label class="ctrl">
        <span class="field-label m-0">月工资(解除前 12 个月平均,税前)</span>
        <input v-model.number="wage" class="input num-input" type="number" min="1" />
      </label>
      <label class="ctrl">
        <span class="field-label m-0">当地社平月工资(选填,三倍封顶用)</span>
        <input v-model="socialAvg" class="input num-input" type="number" min="0" placeholder="如 12000" />
      </label>
      <label class="check self-end"><input v-model="withNotice" type="checkbox" />未提前 30 日通知(算 N+1)</label>
    </div>
  </div>

  <div v-if="result.error" class="error-box mb-14">✗ {{ result.error }}</div>

  <template v-else-if="result.data">
    <div class="stat-grid">
      <div class="panel stat-card highlight">
        <div class="stat-value">{{ result.data.nCapped }} 个月</div>
        <div class="stat-label">经济补偿 N(工作 {{ result.data.yearsText }})</div>
        <div class="stat-tag tone-info">≈ {{ result.data.nText }} 工资</div>
      </div>
      <div class="panel stat-card">
        <div class="stat-value">{{ yuan(result.data.compensationN) }}</div>
        <div class="stat-label">N 金额</div>
        <div v-if="result.data.capped" class="stat-tag tone-warn">已按社平三倍封顶,年限≤12 年</div>
      </div>
      <div class="panel stat-card">
        <div class="stat-value">{{ yuan(result.data.compensation2N) }}</div>
        <div class="stat-label">违法解除赔偿 2N(第 87 条)</div>
      </div>
    </div>

    <div v-if="withNotice" class="panel mt-16">
      <p class="m-0">
        无过失性辞退且未提前 30 日书面通知:N + 1 =
        <b class="accent-num">{{ yuan(result.data.compensationN1) }}</b>
        (代通知金按上月工资 {{ yuan(result.data.noticeAmount) }},不参与三倍封顶)
      </p>
    </div>

    <div class="panel mt-16">
      <p class="tip m-0">
        N 的算法:每满一年支付一个月工资;六个月以上不满一年按一年;不满六个月按半个月。
        月工资 = 解除前 12 个月平均应得工资(含奖金津贴);高于当地社平 3 倍的按 3 倍封顶且年限最高 12 年。
        N+1 中的 1 是「代通知金」,仅适用于无过失性辞退未提前通知的情形;违法解除适用 2N,二者不叠加。
        协商解除、合同到期终止等情形是否支付、支付多少以实际情形与当地裁审口径为准,本工具仅供参考,劳动争议请咨询专业人士。
      </p>
    </div>
  </template>

  <div v-else class="panel">
    <p class="tip m-0"><AppIcon name="calendar-days" :size="15" /> 选择离职日期后自动测算;日期参数可分享给对方打开即得同样结果。</p>
  </div>
</template>

<style scoped>
.form-row {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  align-items: flex-end;
}
.ctrl {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.date-input {
  width: 170px;
  font-family: var(--mono);
}
.num-input {
  width: 150px;
  font-family: var(--mono);
}
.self-end {
  align-self: flex-end;
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
  font-size: 23px;
  font-weight: 700;
  color: var(--accent);
}
.stat-label {
  margin-top: 4px;
  font-size: 14px;
  color: var(--muted);
}
.stat-tag {
  margin-top: 8px;
  display: inline-block;
  font-size: 12.5px;
  padding: 2px 10px;
  border-radius: 999px;
}
.tone-info { background: var(--accent-soft); color: var(--accent); }
.tone-warn { background: rgba(180, 83, 9, 0.12); color: var(--warning); }
.accent-num {
  font-family: var(--mono);
  color: var(--accent);
  font-size: 18px;
}
</style>
