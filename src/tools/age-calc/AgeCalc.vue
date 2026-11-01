<script setup>
import { computed, ref } from 'vue'
import { ageInfo } from '@/utils/ageCalc'
import { useUrlState } from '@/utils/urlState'
import AppIcon from '@/components/AppIcon.vue'

const birth = ref('1995-06-15')
// 基准日留空 = 今天
const at = ref('')

const date = (s) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined)
useUrlState([
  { key: 'b', ref: birth, parse: date },
  { key: 'at', ref: at, parse: date },
])

const result = computed(() => ageInfo(birth.value, at.value || undefined))

const CARDS = [
  { key: 'age', field: 'ageYears', label: '周岁', sub: '法定口径,过了生日才算' },
  { key: 'xusui', field: 'xusui', label: '虚岁', sub: '出生即 1 岁,过农历年加一' },
  { key: 'days', field: 'totalDays', label: '累计生活天数', sub: '按日历日计算' },
]

const fmtInt = (n) => n.toLocaleString('zh-CN')
</script>

<template>
  <div class="panel mb-16">
    <div class="form-row">
      <label class="ctrl">
        <span class="field-label m-0">出生日期</span>
        <input v-model="birth" class="input date-input" type="date" min="1900-01-01" max="2100-12-31" />
      </label>
      <label class="ctrl">
        <span class="field-label m-0">基准日(默认今天)</span>
        <input v-model="at" class="input date-input" type="date" min="1900-01-01" max="2100-12-31" placeholder="今天" />
      </label>
      <button v-if="at" class="btn btn-sm self-end" @click="at = ''">回到今天</button>
    </div>
  </div>

  <div v-if="result.error" class="error-box mb-14">✗ {{ result.error }}</div>

  <template v-else-if="result.data">
    <div class="stat-grid">
      <div v-for="c in CARDS" :key="c.key" class="panel stat-card" :class="{ highlight: c.key === 'age' }">
        <div class="stat-value">{{ fmtInt(result.data[c.field]) }}</div>
        <div class="stat-label">{{ c.label }}<span class="tip"> · {{ c.sub }}</span></div>
      </div>
    </div>

    <div v-if="result.data.birthdayToday" class="panel mt-16 birthday-note">
      <p class="m-0"><AppIcon name="cake" :size="18" /> 今天就是生日,生日快乐!这是新的一岁的第 1 天。</p>
    </div>
    <div v-else class="panel mt-16">
      <p class="m-0">
        下一个生日:<b>{{ result.data.nextBirthday }}</b>
        还有 <b class="accent-num">{{ result.data.nextBirthdayDays }}</b> 天
      </p>
    </div>

    <div class="panel mt-16">
      <div class="fact-grid">
        <div class="fact"><span class="fact-k">出生信息</span><span class="fact-v">{{ result.data.zodiac }}年{{ result.data.ganzhi ? `(${result.data.ganzhi})` : '' }} · {{ result.data.constellation }}</span></div>
        <div class="fact"><span class="fact-k">生活月数</span><span class="fact-v">{{ fmtInt(result.data.totalMonths) }} 个月</span></div>
        <div class="fact"><span class="fact-k">生活周数</span><span class="fact-v">{{ fmtInt(result.data.totalWeeks) }} 周</span></div>
        <div class="fact"><span class="fact-k">生活小时</span><span class="fact-v">约 {{ fmtInt(result.data.totalHours) }} 小时</span></div>
      </div>
    </div>

    <div class="panel mt-16">
      <p class="tip m-0">
        周岁按公历生日计算(法律与证件通用);虚岁按农历年推进,生肖也按农历取——春节前出生的人生肖属上一年,这是与按公历年粗算的工具的差异。
        「基准日」填过去或未来的日期即可算任意时刻的年龄,比如算孩子入学(8 月 31 日前满 6 周岁)是否符合。
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
  font-size: 26px;
  font-weight: 700;
  color: var(--accent);
}
.stat-label {
  margin-top: 4px;
  font-size: 14px;
  color: var(--muted);
}
.birthday-note {
  border-color: color-mix(in srgb, var(--warning) 45%, var(--border));
  background: color-mix(in srgb, var(--warning) 8%, var(--card));
}
.birthday-note p {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}
.accent-num {
  font-family: var(--mono);
  color: var(--accent);
  font-size: 17px;
}
.fact-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 18px;
}
@media (max-width: 720px) {
  .fact-grid {
    grid-template-columns: 1fr;
  }
}
.fact {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  background: var(--bg-soft);
  border-radius: 10px;
  padding: 9px 14px;
  font-size: 14px;
}
.fact-k {
  color: var(--muted);
}
.fact-v {
  font-weight: 600;
}
</style>
