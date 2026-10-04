<script setup>
import { computed, ref } from 'vue'
import { tzOffsetMin, wallTimeToInstant, zoneRows, ZONES } from '@/utils/tzConvert'
import { useCopy } from '@/utils/useCopy'

// datetime-local 默认取当前整点
function nowLocal() {
  const d = new Date()
  const p = (x) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

const localTime = ref(nowLocal())
const baseZone = ref('Asia/Shanghai')
const { copiedKey, copy } = useCopy()

const at = computed(() => wallTimeToInstant(localTime.value, baseZone.value))

const rows = computed(() => {
  if (!at.value || Number.isNaN(at.value.getTime())) return []
  const baseOffset = tzOffsetMin(baseZone.value, at.value)
  return zoneRows(at.value).map((r) => ({
    ...r,
    diff: r.tz === baseZone.value ? null : r.offsetMin - baseOffset,
  }))
})

function diffLabel(min) {
  if (min === null) return '基准'
  const sign = min > 0 ? '+' : ''
  const h = Math.trunc(min / 60)
  const m = Math.abs(min % 60)
  return `差 ${sign}${h}${m ? ' 小时 ' + m + ' 分' : ' 小时'}`
}

function shareText() {
  const lines = rows.value.map((r) => `${r.label} ${r.date} ${r.time} ${r.weekday}(${r.offset})`)
  return `${localTime.value} ${baseZone.value}\n${lines.join('\n')}`
}
</script>

<template>
  <div class="grid-2" style="margin-bottom: 14px">
    <div class="field">
      <label class="field-label">基准时间</label>
      <input v-model="localTime" type="datetime-local" step="60" class="input" />
    </div>
    <div class="field">
      <label class="field-label">基准时区</label>
      <select v-model="baseZone" class="select">
        <option v-for="z in ZONES" :key="z.tz" :value="z.tz">{{ z.label }}({{ z.tz }})</option>
      </select>
    </div>
  </div>

  <div v-if="!rows.length" class="error-box">✗ 请输入合法的时间</div>

  <template v-else>
    <div class="tz-table panel">
      <div v-for="r in rows" :key="r.tz" class="tz-row" :class="{ base: r.tz === baseZone }">
        <span class="tz-city">{{ r.label }}<small class="tz-code">{{ r.tz }}</small></span>
        <span class="tz-main">
          {{ r.date }} <strong>{{ r.time }}</strong>
          <span class="tz-week">{{ r.weekday }}</span>
          <span class="tz-badge" :class="{ work: r.isWorkday }">{{ r.isWorkday ? '工作时间' : '非工作时间' }}</span>
        </span>
        <span class="tz-offset">{{ r.offset }}</span>
        <span class="tz-diff">{{ diffLabel(r.diff) }}</span>
      </div>
    </div>
    <div class="row" style="margin-top: 12px">
      <button class="btn btn-sm" @click="localTime = nowLocal()">回到现在</button>
      <button class="btn btn-sm" @click="copy('tz', shareText())">
        {{ copiedKey === 'tz' ? '✓ 已复制' : '复制对照表' }}
      </button>
    </div>
  </template>
</template>

<style scoped>
.tz-table {
  padding: 4px 0;
  overflow: hidden;
}
.tz-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 16px;
  flex-wrap: wrap;
}
.tz-row + .tz-row {
  border-top: 1px solid var(--border);
}
.tz-row.base {
  background: var(--accent-soft);
}
.tz-city {
  width: 120px;
  font-weight: 600;
  flex-shrink: 0;
}
.tz-code {
  display: block;
  font-weight: 400;
  font-size: 11px;
  color: var(--muted);
  font-family: var(--mono);
}
.tz-main {
  flex: 1;
  min-width: 200px;
  font-variant-numeric: tabular-nums;
}
.tz-week {
  margin-left: 6px;
  color: var(--muted);
  font-size: 13px;
}
.tz-badge {
  margin-left: 8px;
  font-size: 11px;
  padding: 1px 7px;
  border-radius: 5px;
  background: var(--bg-soft);
  color: var(--muted);
}
.tz-badge.work {
  background: rgba(22, 163, 74, 0.12);
  color: #16a34a;
}
.tz-offset {
  width: 70px;
  font-family: var(--mono);
  font-size: 13px;
  color: var(--muted);
  text-align: right;
  flex-shrink: 0;
}
.tz-diff {
  width: 110px;
  font-size: 13px;
  color: var(--muted);
  text-align: right;
  flex-shrink: 0;
}
</style>