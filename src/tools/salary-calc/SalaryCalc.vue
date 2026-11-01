<script setup>
import { computed, ref } from 'vue'
import { netFromGross, grossFromNet } from '@/utils/salary'
import { useUrlState } from '@/utils/urlState'
import AppIcon from '@/components/AppIcon.vue'

const mode = ref('gross') // gross: 税前→税后;net: 税后→税前
const gross = ref(20000)
const net = ref(15000)
const base = ref('') // 缴费基数,空 = 等于月薪
const housingPct = ref(12)
const special = ref(0)

const num = (lo, hi) => (s) => {
  const v = Number(s)
  return Number.isFinite(v) && v >= lo && v <= hi ? v : undefined
}
useUrlState([
  { key: 'm', ref: mode, parse: (s) => (['gross', 'net'].includes(s) ? s : undefined) },
  { key: 'g', ref: gross, parse: num(1, 10000000) },
  { key: 'n', ref: net, parse: num(1, 10000000) },
  { key: 'b', ref: base, parse: (s) => (s === '' ? '' : num(0, 10000000)(s)) },
  { key: 'hf', ref: housingPct, parse: num(5, 12) },
  { key: 'sd', ref: special, parse: num(0, 100000) },
])

const fwd = computed(() => {
  const b = base.value === '' ? gross.value : base.value
  try {
    return { error: '', data: netFromGross(gross.value, { base: b, housingPct: housingPct.value, special: special.value }) }
  } catch (e) {
    return { error: e.message, data: null }
  }
})

const rev = computed(() => {
  try {
    return { error: '', data: grossFromNet(net.value, { housingPct: housingPct.value, special: special.value }) }
  } catch (e) {
    return { error: e.message, data: null }
  }
})

const yuan = (v) => `¥${(+Number(v).toFixed(2)).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`
</script>

<template>
  <div class="panel mb-16">
    <div class="form-row">
      <div class="row gap-8" role="radiogroup" aria-label="换算方向">
        <button class="btn btn-sm" :class="{ 'btn-primary': mode === 'gross' }" role="radio" :aria-checked="mode === 'gross'" @click="mode = 'gross'">税前 → 税后</button>
        <button class="btn btn-sm" :class="{ 'btn-primary': mode === 'net' }" role="radio" :aria-checked="mode === 'net'" @click="mode = 'net'">税后 → 税前</button>
      </div>
      <label v-if="mode === 'gross'" class="ctrl">
        <span class="field-label m-0">税前月薪(元)</span>
        <input v-model.number="gross" class="input num-input" type="number" min="1" />
      </label>
      <label v-else class="ctrl">
        <span class="field-label m-0">税后月薪(元,到手)</span>
        <input v-model.number="net" class="input num-input" type="number" min="1" />
      </label>
      <label v-if="mode === 'gross'" class="ctrl">
        <span class="field-label m-0">缴费基数(默认=月薪)</span>
        <input v-model="base" class="input num-input" type="number" min="0" placeholder="默认=月薪" />
      </label>
      <label class="ctrl">
        <span class="field-label m-0">公积金比例 {{ housingPct }}%</span>
        <input v-model.number="housingPct" type="range" min="5" max="12" step="1" class="range" />
      </label>
      <label class="ctrl">
        <span class="field-label m-0">专项附加扣除/月</span>
        <input v-model.number="special" class="input num-input" type="number" min="0" step="100" />
      </label>
    </div>
  </div>

  <!-- 税前 → 税后 -->
  <template v-if="mode === 'gross'">
    <div v-if="fwd.error" class="error-box mb-14">✗ {{ fwd.error }}</div>
    <template v-else-if="fwd.data">
      <div class="stat-grid">
        <div class="panel stat-card highlight">
          <div class="stat-value">{{ yuan(fwd.data.netFirst) }}</div>
          <div class="stat-label">第 1 个月到手</div>
          <div class="stat-tag tone-info">个税累计预扣,年初最低</div>
        </div>
        <div class="panel stat-card">
          <div class="stat-value">{{ yuan(fwd.data.avgNet) }}</div>
          <div class="stat-label">全年平均月到手</div>
          <div class="stat-tag tone-warn">年末跳档后会低于此数</div>
        </div>
        <div class="panel stat-card">
          <div class="stat-value">{{ yuan(fwd.data.insurance.total) }}</div>
          <div class="stat-label">五险一金(个人)/月</div>
          <div class="stat-tag tone-ok">公积金可取现或抵房贷</div>
        </div>
      </div>

      <div class="panel mt-16">
        <p class="m-0 mb-8"><b>五险一金明细(个人部分,基数 {{ yuan(base === '' ? gross : base) }})</b></p>
        <div class="detail-row" v-for="p in fwd.data.insurance.parts" :key="p.id">
          <span>{{ p.label }}</span><span class="mono">{{ (p.rate * 100).toFixed(1) }}%</span><span class="mono">{{ yuan(p.amount) }}</span>
        </div>
        <div class="detail-row">
          <span>{{ fwd.data.insurance.housing.label }}</span>
          <span class="mono">{{ (fwd.data.insurance.housing.rate * 100).toFixed(0) }}%</span>
          <span class="mono">{{ yuan(fwd.data.insurance.housing.amount) }}</span>
        </div>
        <div class="detail-row total">
          <span>合计</span><span class="mono">{{ ((0.08 + 0.02 + 0.005) * 100 + Number(housingPct)).toFixed(1) }}%</span><span class="mono">{{ yuan(fwd.data.insurance.total) }}</span>
        </div>
      </div>

      <div class="panel mt-16">
        <p class="m-0 mb-8"><b>个税(累计预扣,假设全年月薪恒定)</b></p>
        <div class="detail-row">
          <span>第 1 个月个税</span><span class="mono">{{ yuan(fwd.data.taxFirst) }}</span>
        </div>
        <div class="detail-row">
          <span>第 12 个月个税(跳档后)</span><span class="mono">{{ yuan(fwd.data.schedule.rows[11].tax) }}</span>
        </div>
        <div class="detail-row total">
          <span>全年个税合计</span><span class="mono">{{ yuan(fwd.data.annualTax) }}</span>
        </div>
        <p class="tip m-0 mt-8">
          累计预扣下年初个税最低、年末最高属正常现象;「平均到手」已把跳档摊平。
          缴费基数通常有当地上下限,请按实际填;专项附加扣除(房租/房贷/赡养等)填月度合计。
        </p>
      </div>
    </template>
  </template>

  <!-- 税后 → 税前 -->
  <template v-else>
    <div v-if="rev.error" class="error-box mb-14">✗ {{ rev.error }}</div>
    <div v-else-if="rev.data" class="stat-grid">
      <div class="panel stat-card highlight">
        <div class="stat-value">{{ yuan(rev.data.gross) }}</div>
        <div class="stat-label">需要税前月薪约</div>
        <div class="stat-tag tone-info">按全年平均到手反推</div>
      </div>
      <div class="panel stat-card">
        <div class="stat-value">{{ yuan(rev.data.insurance.total) }}</div>
        <div class="stat-label">五险一金(个人)/月</div>
      </div>
      <div class="panel stat-card">
        <div class="stat-value">{{ yuan(rev.data.annualTax) }}</div>
        <div class="stat-label">全年个税合计</div>
      </div>
    </div>
  </template>

  <div class="panel mt-16">
    <p class="tip m-0">
      口径说明:五险一金按个人部分常用比例估算(各地医疗/失业比例略有差异);个税按累计预扣法、以「全年月薪恒定」为前提,
      与「个税计算器」同口径。跳档(税率升档)月份到手会明显下降属正常。Offer 谈薪时建议直接对比「税前总包」。
    </p>
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
.num-input {
  width: 150px;
  font-family: var(--mono);
}
.range {
  accent-color: var(--accent);
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
  word-break: break-all;
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
.tone-ok { background: rgba(21, 128, 61, 0.12); color: var(--success); }
.tone-info { background: var(--accent-soft); color: var(--accent); }
.tone-warn { background: rgba(180, 83, 9, 0.12); color: var(--warning); }
.detail-row {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  padding: 6px 0;
  border-bottom: 1px dashed var(--border);
  font-size: 14px;
}
.detail-row .mono {
  font-family: var(--mono);
  min-width: 90px;
  text-align: right;
}
.detail-row.total {
  border-bottom: none;
  font-weight: 700;
}
.detail-row.total .mono {
  color: var(--accent);
}
</style>
