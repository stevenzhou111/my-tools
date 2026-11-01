<script setup>
import { computed, ref } from 'vue'
import { dueDateInfo } from '@/utils/dueDate'
import { useUrlState } from '@/utils/urlState'
import AppIcon from '@/components/AppIcon.vue'

const lmp = ref('')
const cycle = ref(28)

const num = (lo, hi) => (s) => {
  const v = Number(s)
  return Number.isFinite(v) && v >= lo && v <= hi ? v : undefined
}
const dateStr = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(s || '') ? s : undefined)
useUrlState([
  { key: 'l', ref: lmp, parse: dateStr },
  { key: 'c', ref: cycle, parse: num(21, 45) },
])

const result = computed(() => dueDateInfo(lmp.value, cycle.value))
</script>

<template>
  <div class="panel mb-16">
    <div class="form-row">
      <label class="ctrl">
        <span class="field-label m-0">末次月经第一天</span>
        <input v-model="lmp" class="input date-input" type="date" min="2020-01-01" max="2100-12-31" />
      </label>
      <label class="ctrl">
        <span class="field-label m-0">月经周期(天)</span>
        <input v-model.number="cycle" class="input cycle-input" type="number" min="21" max="45" />
      </label>
      <span v-if="cycle !== 28" class="self-end tip">周期 ≠ 28 天时预产期按 {{ cycle > 28 ? '推后' : '提前' }} {{ Math.abs(cycle - 28) }} 天修正</span>
    </div>
  </div>

  <div v-if="result.error" class="error-box mb-14">✗ {{ result.error }}</div>

  <template v-else-if="result.data">
    <div class="stat-grid">
      <div class="panel stat-card highlight">
        <div class="stat-value">{{ result.data.dueText }}</div>
        <div class="stat-label">预产期(Naegele 法则,{{ result.data.totalDays }} 天)</div>
        <div class="stat-tag tone-info">仅供预估,满 37 周~42 周内分娩都属正常</div>
      </div>
      <div class="panel stat-card">
        <div class="stat-value">{{ result.data.born ? '已到预产期' : `${result.data.week} 周 ${result.data.day} 天` }}</div>
        <div class="stat-label">当前孕周</div>
        <div class="stat-tag tone-ok">{{ result.data.stage }}</div>
      </div>
      <div class="panel stat-card">
        <div class="stat-value">{{ result.data.born ? '0' : result.data.remain }}</div>
        <div class="stat-label">{{ result.data.born ? '预产期已到,注意临产征兆' : '距预产期天数' }}</div>
      </div>
    </div>

    <div class="panel mt-16">
      <div class="progress-track" role="img" :aria-label="`孕期进度 ${result.data.progress}%`">
        <div class="progress-fill" :style="{ width: result.data.progress + '%' }"></div>
      </div>
      <div class="progress-labels">
        <span>0 周</span><span>13 周</span><span>27 周</span><span>40 周</span>
      </div>
    </div>

    <div v-if="result.data.currentMilestones.length || result.data.nextMilestone" class="panel mt-16">
      <p class="m-0 mb-8"><AppIcon name="stethoscope" :size="16" /> 产检节点</p>
      <div v-for="ms in result.data.currentMilestones" :key="ms.label" class="milestone now">
        <AppIcon name="check" :size="14" />{{ ms.label }} — 正在窗口期内
      </div>
      <div v-if="result.data.nextMilestone" class="milestone">
        <AppIcon name="calendar-days" :size="14" />下一项:{{ result.data.nextMilestone.label }}
      </div>
    </div>

    <div class="panel mt-16">
      <p class="tip m-0">
        预产期按末次月经 + 280 天估算(周期不规律者误差较大,孕早期超声核对更准)。
        孕周按「末次月经当天为 0 周 0 天」计算;实际分娩在 37~42 周均属正常,预产期当周分娩的只有约 5%。
        本工具仅供参考,产检安排请以建档医院为准。
      </p>
    </div>
  </template>
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
  width: 190px;
  font-family: var(--mono);
}
.cycle-input {
  width: 110px;
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
  font-size: 22px;
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
.tone-ok { background: rgba(21, 128, 61, 0.12); color: var(--success); }
.tone-info { background: var(--accent-soft); color: var(--accent); }
.progress-track {
  height: 12px;
  border-radius: 999px;
  background: var(--bg-soft);
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: var(--accent-grad);
  border-radius: 999px;
  transition: width 0.3s;
}
.progress-labels {
  display: flex;
  justify-content: space-between;
  font-family: var(--mono);
  font-size: 12px;
  color: var(--muted);
  margin-top: 6px;
}
.milestone {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 0;
  font-size: 14.5px;
  color: var(--muted);
}
.milestone.now {
  color: var(--success);
  font-weight: 600;
}
</style>
