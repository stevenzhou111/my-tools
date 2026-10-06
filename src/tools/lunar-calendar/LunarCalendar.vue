<script setup>
import { computed, ref } from 'vue'
import { lunarToSolar, solarToLunar } from '@/utils/lunar'
import { useUrlState } from '@/utils/urlState'

// 今天(本地时区)的 ISO 形式 yyyy-mm-dd
const todayIso = (() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})()

const date = ref(todayIso)
useUrlState([{ key: 'd', ref: date, parse: (s) => (/^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined) }])

const l = computed(() => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.value)
  if (!m) return null
  return solarToLunar(new Date(+m[1], +m[2] - 1, +m[3]))
})

// 农历 → 公历
const ly = ref(2026)
const lm = ref(1)
const ld = ref(1)
const lLeap = ref(false)
const backDate = ref('')
const backError = ref('')

function fromLunar() {
  backDate.value = ''
  backError.value = ''
  const d = lunarToSolar({ year: ly.value, month: lm.value, day: ld.value, isLeap: lLeap.value })
  if (!d) {
    backError.value = '该农历日期无效:检查年份范围、该年是否有此闰月以及当月天数'
    return
  }
  backDate.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)
const DAYS = Array.from({ length: 30 }, (_, i) => i + 1)

function setToday() {
  date.value = todayIso
}
</script>

<template>
  <div class="panel" style="margin-bottom: 16px; text-align: center; padding: 26px 18px">
    <div class="today-text">{{ l?.text ?? '—' }}</div>
    <div class="tip" style="margin-top: 6px">今天是 {{ todayIso }}(农历以本地时区计算)</div>
  </div>

  <div class="grid-2" style="align-items: start">
    <div class="panel">
      <h3 style="font-size: 15.5px; margin-bottom: 12px">📅 公历 → 农历</h3>
      <div class="field">
        <label class="field-label" for="lc-date">公历日期</label>
        <input id="lc-date" v-model="date" type="date" class="input" />
      </div>
      <div class="row" style="margin-bottom: 12px">
        <button class="btn btn-sm" @click="setToday">回到今天</button>
      </div>
      <template v-if="l">
        <div class="lunar-result">
          <div class="lunar-big">{{ l.monthName }}{{ l.dayName }}</div>
          <div class="lunar-sub">{{ l.text }}</div>
        </div>
      </template>
      <p v-else class="error-box">✗ 超出支持范围(1900 – 2100)</p>
    </div>

    <div class="panel">
      <h3 style="font-size: 15.5px; margin-bottom: 12px">🌙 农历 → 公历</h3>
      <div class="row" style="margin-bottom: 12px">
        <label class="ctrl">
          <span class="field-label" style="margin: 0">农历年份</span>
          <input v-model.number="ly" type="number" min="1900" max="2100" class="input num-in" />
        </label>
        <label class="ctrl">
          <span class="field-label" style="margin: 0">月份</span>
          <select v-model.number="lm" class="select num-in">
            <option v-for="m in MONTHS" :key="m" :value="m">{{ m }} 月</option>
          </select>
        </label>
        <label class="ctrl">
          <span class="field-label" style="margin: 0">日</span>
          <select v-model.number="ld" class="select num-in">
            <option v-for="d in DAYS" :key="d" :value="d">{{ d }}</option>
          </select>
        </label>
      </div>
      <label class="check" style="margin-bottom: 12px">
        <input v-model="lLeap" type="checkbox" />
        是闰月(仅有闰月的年份可选)
      </label>
      <button class="btn btn-primary" style="margin-bottom: 12px" @click="fromLunar">转换为公历</button>
      <div v-if="backDate" class="lunar-result">
        <div class="lunar-big">{{ backDate }}</div>
      </div>
      <div v-else-if="backError" class="error-box" style="margin-bottom: 12px">✗ {{ backError }}</div>
      <p class="tip">
        如:农历 2026 年正月初一 → 2026-02-17(春节)。闰月排在该数字月之后,例如闰六月晚于六月。
      </p>
    </div>
  </div>

  <p class="tip" style="margin-top: 12px">
    采用 1900–2100 年农历数据表,以历年春节锚点校验;干支纪年以立春前的农历年计(此处按农历年取干支,与部分排盘工具有差异)。
    日期会同步到地址栏,点标题栏「分享状态」或直接复制链接即可分享当前结果。
  </p>
</template>

<style scoped>
.today-text {
  font-size: 26px;
  font-weight: 700;
  color: var(--accent);
}
.lunar-result {
  background: var(--accent-soft);
  border-radius: 10px;
  padding: 14px;
  text-align: center;
}
.lunar-big {
  font-size: 24px;
  font-weight: 700;
  color: var(--accent);
}
.lunar-sub {
  margin-top: 4px;
  color: var(--muted);
  font-size: 14.5px;
}
.ctrl {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.num-in {
  width: 110px;
}
</style>
