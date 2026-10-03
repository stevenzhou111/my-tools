<script setup>
import { computed, ref, watch } from 'vue'
import { addDays, addWorkdays, diffDays, formatDate, parseDate, weekdayName, workdaysBetween } from '@/utils/dateCalc'
import { useCopy } from '@/utils/useCopy'

const { copiedKey, copy } = useCopy()

// 用本地时区的今天作为默认值,避免 toISOString 的 UTC 偏移差一天
function today() {
  const d = new Date()
  const p = (x) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const start = ref(today())
const end = ref(today())
const delta = ref(30)
const deltaMode = ref('calendar') // calendar | workday
const deltaDir = ref('plus') // plus | minus

const diff = computed(() => {
  const a = parseDate(start.value)
  const b = parseDate(end.value)
  if (!a || !b) return { error: '请输入合法日期(YYYY-MM-DD)' }
  const days = diffDays(a, b)
  return {
    error: '',
    days,
    workdays: workdaysBetween(a, b),
    weeks: (Math.abs(days) / 7).toFixed(1),
    endName: weekdayName(b),
    startName: weekdayName(a),
  }
})

const shifted = computed(() => {
  const a = parseDate(start.value)
  if (!a) return { error: '请输入合法的起始日期(YYYY-MM-DD)' }
  const n = Math.floor(Number(delta.value))
  if (!Number.isFinite(n)) return { error: '请输入整数天数' }
  const signed = deltaDir.value === 'plus' ? n : -n
  const out = deltaMode.value === 'workday' ? addWorkdays(a, signed) : addDays(a, signed)
  return { error: '', date: formatDate(out), name: weekdayName(out) }
})

watch([start, deltaMode, deltaDir], () => {}, { immediate: true })

function setToday(which) {
  if (which === 'start') start.value = today()
  else end.value = today()
}
</script>

<template>
  <div class="grid-2">
    <section class="panel">
      <h3>日期差计算</h3>
      <div class="grid-2">
        <div class="field">
          <label class="field-label">起始日期({{ diff.startName }})</label>
          <input v-model="start" type="date" class="input" />
        </div>
        <div class="field">
          <label class="field-label">结束日期({{ diff.endName }})</label>
          <div class="row" style="gap: 8px">
            <input v-model="end" type="date" class="input" />
            <button class="btn btn-sm" @click="setToday('end')">今天</button>
          </div>
        </div>
      </div>

      <div v-if="diff.error" class="error-box">✗ {{ diff.error }}</div>
      <template v-else>
        <div class="stat-grid">
          <div class="stat">
            <span class="stat-num">{{ diff.days }}</span>
            <span class="stat-label">日历日(含两端差值)</span>
          </div>
          <div class="stat">
            <span class="stat-num">{{ diff.workdays }}</span>
            <span class="stat-label">工作日(跳过周六日,含两端)</span>
          </div>
          <div class="stat">
            <span class="stat-num">{{ diff.weeks }}</span>
            <span class="stat-label">周(绝对值)</span>
          </div>
        </div>
      </template>
    </section>

    <section class="panel">
      <h3>日期推算</h3>
      <div class="field">
        <label class="field-label">基于日期</label>
        <div class="row" style="gap: 8px">
          <input v-model="start" type="date" class="input" />
          <button class="btn btn-sm" @click="setToday('start')">今天</button>
        </div>
      </div>
      <div class="grid-2">
        <div class="field">
          <label class="field-label">方向</label>
          <select v-model="deltaDir" class="select">
            <option value="plus">之后</option>
            <option value="minus">之前</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label">天数</label>
          <input v-model="delta" type="number" class="input" />
        </div>
      </div>
      <div class="row" style="margin-bottom: 12px">
        <label class="check"><input v-model="deltaMode" type="radio" value="calendar" />按日历日</label>
        <label class="check"><input v-model="deltaMode" type="radio" value="workday" />按工作日(跳过周六日)</label>
      </div>

      <div v-if="shifted.error" class="error-box">✗ {{ shifted.error }}</div>
      <template v-else>
        <label class="field-label">结果</label>
        <div class="row" style="gap: 8px">
          <pre class="output" style="flex: 1">{{ shifted.date }} {{ shifted.name }}</pre>
          <button class="btn btn-sm" @click="copy('date', shifted.date)">
            {{ copiedKey === 'date' ? '✓ 已复制' : '复制' }}
          </button>
        </div>
      </template>
    </section>
  </div>
</template>

<style scoped>
.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.stat {
  text-align: center;
  padding: 14px 8px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg-soft);
}
.stat-num {
  display: block;
  font-size: 26px;
  font-weight: 800;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}
.stat-label {
  font-size: 12.5px;
  color: var(--muted);
}
@media (max-width: 640px) {
  .stat-grid {
    grid-template-columns: 1fr;
  }
}
</style>