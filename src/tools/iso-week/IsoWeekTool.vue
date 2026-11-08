<script setup>
import { computed, ref, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import CopyButton from '@/components/CopyButton.vue'
import { isoWeekOf, isoWeekRange, weeksInYear } from '@/utils/isoWeek'

/**
 * ISO 8601 周历:周一为一周之始、含 1 月 4 日的那周是第 1 周。
 * 日期→周号、年周→区间双向换算,全部本地计算。
 */

const today = new Date()
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const dateInput = ref(ymd(today))
const year = ref(today.getFullYear())
const week = ref(isoWeekOf(today).week)

const ofDate = computed(() => {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(dateInput.value.trim())
  if (!m) return null
  const d = new Date(+m[1], +m[2] - 1, +m[3])
  if (Number.isNaN(d.getTime())) return null
  return isoWeekOf(d)
})

const range = computed(() => {
  try {
    return isoWeekRange(Number(year.value), Number(week.value))
  } catch {
    return null
  }
})

const fmt = (d) => ymd(d)
const weekdayCN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

// 年份变化时把周号夹回合法范围
watch(year, (y) => {
  const max = weeksInYear(Number(y))
  if (Number(week.value) > max) week.value = max
})
</script>

<template>
  <div class="panel mb-16">
    <p class="field-label">日期 → ISO 周号</p>
    <div class="row ctrl-row">
      <input v-model="dateInput" class="input" style="width: 170px" placeholder="2026-01-01" spellcheck="false" />
      <button class="btn btn-sm" @click="dateInput = ymd(new Date())">今天</button>
    </div>
    <p v-if="ofDate" class="result m-0 mt-10">
      {{ dateInput }} 是 <b>{{ ofDate.year }} 年第 {{ ofDate.week }} 周</b>
      <span class="tip">(ISO-8601,写作 {{ ofDate.year }}-W{{ String(ofDate.week).padStart(2, '0') }})</span>
    </p>
    <p v-else class="tip m-0 mt-10">按 YYYY-MM-DD 输入日期</p>
  </div>

  <div class="panel">
    <p class="field-label">年 + 周号 → 日期区间</p>
    <div class="row ctrl-row">
      <label class="ctrl">
        <span class="field-label">年份</span>
        <input v-model.number="year" class="input" type="number" style="width: 110px" />
      </label>
      <label class="ctrl">
        <span class="field-label">第几周(1~{{ weeksInYear(Number(year)) || 52 }})</span>
        <input v-model.number="week" class="input" type="number" min="1" style="width: 90px" />
      </label>
    </div>
    <template v-if="range">
      <div class="row mt-10 week-range">
        <div class="day"><AppIcon name="calendar-range" :size="14" />周一<b>{{ fmt(range.monday) }}</b></div>
        <div class="day"><AppIcon name="calendar-range" :size="14" />周日<b>{{ fmt(range.sunday) }}</b></div>
      </div>
      <div class="row mt-10">
        <CopyButton class="btn btn-sm" :text="`${year} 年第 ${week} 周:${fmt(range.monday)} ~ ${fmt(range.sunday)}`" label="复制区间" />
      </div>
      <p class="tip m-0 mt-10">{{ weekdayCN[range.monday.getDay()] }} 起始,共 7 天。</p>
    </template>
  </div>
</template>

<style scoped>
.ctrl-row {
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 14px;
}
.result { font-size: 15px; }
.week-range {
  gap: 18px;
  flex-wrap: wrap;
}
.day {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--muted);
}
.day b { color: var(--text); margin-left: 4px; }
</style>
