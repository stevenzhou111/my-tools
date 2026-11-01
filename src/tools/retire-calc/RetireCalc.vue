<script setup>
import { computed, ref } from 'vue'
import { retireInfo, RETIRE_TRACKS } from '@/utils/retire'
import { useUrlState } from '@/utils/urlState'

const birthYm = ref('1985-06')
const track = ref('male')

useUrlState([
  { key: 'b', ref: birthYm, parse: (s) => (/^(?:19|20)\d{2}-(?:0?[1-9]|1[0-2])$/.test(s) ? s : undefined) },
  { key: 't', ref: track, parse: (s) => (RETIRE_TRACKS.some((t) => t.id === s) ? s : undefined) },
])

const today = new Date()
const currentYm = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

const result = computed(() => {
  try {
    return { error: '', data: retireInfo(birthYm.value, track.value) }
  } catch (e) {
    return { error: e.message, data: null }
  }
})

const trackInfo = computed(() => RETIRE_TRACKS.find((t) => t.id === track.value))

const ageText = computed(() => {
  const d = result.value.data
  if (!d) return ''
  return d.ageMonths ? `${d.ageYears} 岁 ${d.ageMonths} 个月` : `${d.ageYears} 岁`
})

// 用出生月 + 法定年龄月数换算的Readable文案
const ymText = (ym) => {
  const [y, m] = ym.split('-')
  return `${y} 年 ${Number(m)} 月`
}

// 是否已退休(出生月 + 法定年龄 ≤ 当前月)
const alreadyRetired = computed(() => {
  const d = result.value.data
  if (!d) return false
  const [y, m] = d.retireYm.split('-').map(Number)
  const [cy, cm] = currentYm.split('-').map(Number)
  return y * 12 + m <= cy * 12 + cm
})
</script>

<template>
  <div class="panel mb-16">
    <div class="form-row">
      <label class="ctrl">
        <span class="field-label m-0">出生年月</span>
        <input v-model="birthYm" class="input birth-input" type="month" min="1900-01" max="2099-12" />
      </label>
      <div class="ctrl grow" role="radiogroup" aria-label="人员类别">
        <span class="field-label m-0">人员类别</span>
        <div class="row track-row">
          <button
            v-for="t in RETIRE_TRACKS"
            :key="t.id"
            class="btn btn-sm"
            :class="{ 'btn-primary': track === t.id }"
            role="radio"
            :aria-checked="track === t.id"
            @click="track = t.id"
          >
            {{ t.label }}
          </button>
        </div>
      </div>
    </div>
  </div>

  <div v-if="result.error" class="error-box mb-14">✗ {{ result.error }}</div>

  <template v-else-if="result.data">
    <div class="stat-grid">
      <div class="panel stat-card highlight">
        <div class="stat-value">{{ ageText }}</div>
        <div class="stat-label">改革后法定退休年龄</div>
        <div v-if="result.data.delayMonths" class="stat-tag tone-warn">较原规定延迟 {{ result.data.delayMonths }} 个月</div>
        <div v-else class="stat-tag tone-ok">{{ result.data.before ? '改革前退休,不受影响' : '按原法定年龄' }}</div>
      </div>
      <div class="panel stat-card">
        <div class="stat-value">{{ ymText(result.data.retireYm) }}</div>
        <div class="stat-label">达到法定退休年龄</div>
        <div class="stat-tag tone-info">原为 {{ ymText(result.data.originalYm) }}</div>
      </div>
      <div class="panel stat-card">
        <div class="stat-value small">{{ ymText(result.data.earliestYm) }}<br />~ {{ ymText(result.data.latestYm) }}</div>
        <div class="stat-label">弹性区间(可提前 / 延后 ≤3 年)</div>
      </div>
    </div>

    <div v-if="alreadyRetired" class="panel mt-16 retired-note">
      <p class="m-0">按此推算已到达法定退休年龄:如仍在职,说明单位采用了弹性延后退休或类别选择有误,可切换人员类别再试。</p>
    </div>

    <div class="panel mt-16">
      <p class="tip m-0 mb-10">
        「{{ trackInfo.label }}」的规则:原 {{ trackInfo.base }} 岁退休,自 {{ trackInfo.start.slice(0, 4) }} 年
        {{ Number(trackInfo.start.slice(5)) }} 月起出生的职工,每 {{ trackInfo.step }} 个月出生延迟 1 个月,
        逐步延至 {{ trackInfo.cap }} 岁。
      </p>
      <p class="tip m-0">
        弹性退休(2025 年起施行):满足最低缴费年限等条件时可自愿选择弹性提前,但不得低于原法定退休年龄;与单位协商一致也可延后,最长 3 年。
        本工具按月推算法定口径,仅供参考;职工保险最低缴费年限自 2030 年起逐步从 15 年提高到 20 年,实际以人社部门认定为准。
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
.grow {
  flex: 1;
  min-width: 260px;
}
.birth-input {
  width: 190px;
  font-family: var(--mono);
}
.track-row {
  gap: 6px;
  flex-wrap: wrap;
}
.stat-grid {
  display: grid;
  grid-template-columns: 1.1fr 1fr 1.3fr;
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
  font-size: 25px;
  font-weight: 700;
  color: var(--accent);
  line-height: 1.3;
}
.stat-value.small {
  font-size: 19px;
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
.retired-note {
  border-color: color-mix(in srgb, var(--warning) 40%, var(--border));
}
</style>
