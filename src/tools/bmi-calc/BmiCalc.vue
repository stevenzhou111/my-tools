<script setup>
import { computed, ref } from 'vue'
import { healthStats, tdee, ACTIVITY_LEVELS } from '@/utils/health'
import { useUrlState } from '@/utils/urlState'

const sex = ref('male')
const age = ref(28)
const heightCm = ref(170)
const weightKg = ref(65)
const activity = ref('sedentary')

const num = (lo, hi) => (s) => {
  const v = Number(s)
  return Number.isFinite(v) && v >= lo && v <= hi ? v : undefined
}
useUrlState([
  { key: 's', ref: sex, parse: (v) => (['male', 'female'].includes(v) ? v : undefined) },
  { key: 'a', ref: age, parse: num(1, 120) },
  { key: 'h', ref: heightCm, parse: num(80, 250) },
  { key: 'w', ref: weightKg, parse: num(20, 400) },
  { key: 'act', ref: activity, parse: (v) => (ACTIVITY_LEVELS.some((l) => l.id === v) ? v : undefined) },
])

const result = computed(() => {
  try {
    return { error: '', data: healthStats({ sex: sex.value, age: age.value, heightCm: heightCm.value, weightKg: weightKg.value }) }
  } catch {
    return { error: '输入有误,请检查各项数值', data: null }
  }
})

// BMI 标尺渐变(15~35 映射,分段对应 偏瘦/正常/超重/肥胖 切点)
const BAR_GRADIENT = 'linear-gradient(90deg, #60a5fa 0%, #34d399 18%, #34d399 45%, #fbbf24 65%, #f87171 100%)'

// BMI 等级对应的语义色 tone
function bmiTone(bmi) {
  if (bmi < 18.5) return 'info'
  if (bmi < 24) return 'ok'
  if (bmi < 28) return 'warn'
  return 'danger'
}

const factor = computed(() => ACTIVITY_LEVELS.find((l) => l.id === activity.value)?.factor ?? 1.2)
const tdeeValue = computed(() => (result.value.data?.error ? null : tdee(result.value.data.bmr, factor.value)))

// BMI 标尺上的百分比位置(15 ~ 35 映射到 0% ~ 100%),越界裁边
const bmiPos = computed(() => {
  const v = result.value.data?.bmi
  if (!v) return null
  return Math.min(100, Math.max(0, ((v - 15) / 20) * 100))
})

// 常见热量场景:一日三餐的参考摄入
const portions = computed(() => {
  if (!tdeeValue.value) return null
  return {
    lose: tdeeValue.value - 400,
    keep: tdeeValue.value,
    gain: tdeeValue.value + 300,
  }
})
</script>

<template>
  <div class="panel mb-16">
    <div class="form-row">
      <div class="ctrl" role="radiogroup" aria-label="性别">
        <span class="field-label m-0">性别</span>
        <div class="row gap-8">
          <button class="btn btn-sm" :class="{ 'btn-primary': sex === 'male' }" role="radio" :aria-checked="sex === 'male'" @click="sex = 'male'">男</button>
          <button class="btn btn-sm" :class="{ 'btn-primary': sex === 'female' }" role="radio" :aria-checked="sex === 'female'" @click="sex = 'female'">女</button>
        </div>
      </div>
      <label class="ctrl">
        <span class="field-label m-0">年龄(岁)</span>
        <input v-model.number="age" class="input num-input" type="number" min="1" max="120" />
      </label>
      <label class="ctrl">
        <span class="field-label m-0">身高(cm)</span>
        <input v-model.number="heightCm" class="input num-input" type="number" min="80" max="250" />
      </label>
      <label class="ctrl">
        <span class="field-label m-0">体重(kg)</span>
        <input v-model.number="weightKg" class="input num-input" type="number" min="20" max="400" step="0.1" />
      </label>
    </div>
    <div class="ctrl mt-12">
      <span class="field-label m-0">日常活动量</span>
      <div class="act-row" role="radiogroup" aria-label="日常活动量">
        <button
          v-for="l in ACTIVITY_LEVELS"
          :key="l.id"
          class="btn btn-sm act-btn"
          :class="{ 'btn-primary': activity === l.id }"
          role="radio"
          :aria-checked="activity === l.id"
          :title="l.note"
          @click="activity = l.id"
        >
          {{ l.label }}
        </button>
      </div>
    </div>
  </div>

  <div v-if="result.error" class="error-box mb-14">✗ {{ result.error }}</div>
  <div v-else-if="result.data" class="stat-grid">
    <div class="panel stat-card">
      <div class="stat-value">{{ result.data.bmi }}</div>
      <div class="stat-label">BMI 指数</div>
      <div class="stat-tag" :class="`tone-${bmiTone(result.data.bmi)}`">{{ result.data.bmiLevel }}</div>
    </div>
    <div class="panel stat-card">
      <div class="stat-value">{{ result.data.bmr }}</div>
      <div class="stat-label">基础代谢 BMR(kcal/天)</div>
      <div class="stat-tag tone-info">静息消耗</div>
    </div>
    <div class="panel stat-card">
      <div class="stat-value">{{ tdeeValue }}</div>
      <div class="stat-label">每日总消耗 TDEE(kcal)</div>
      <div class="stat-tag tone-info">{{ ACTIVITY_LEVELS.find((l) => l.id === activity)?.label }}</div>
    </div>
  </div>

  <div v-if="result.data && bmiPos !== null" class="panel mt-16">
    <div class="bmi-scale" role="img" :aria-label="`BMI ${result.data.bmi},${result.data.bmiLevel}`">
      <div class="bmi-bar" :style="{ background: BAR_GRADIENT }">
        <span class="bmi-marker" :style="{ left: bmiPos + '%' }"></span>
      </div>
      <div class="bmi-ticks">
        <span>15</span><span>18.5</span><span>24</span><span>28</span><span>35</span>
      </div>
      <p class="tip m-0">
        正常 BMI 范围 18.5~24,对应理想体重 <b>{{ result.data.idealMin }} ~ {{ result.data.idealMax }} kg</b>(按当前身高)。
      </p>
    </div>
  </div>

  <div v-if="portions" class="panel mt-16">
    <p class="tip m-0 mb-10">按当前 TDEE 估的每日热量参考(长期增减重请循序渐进,不超过 ±500 kcal):</p>
    <div class="diet-grid">
      <div class="diet-item"><b>{{ portions.lose }}</b><span>减重期参考</span></div>
      <div class="diet-item"><b>{{ portions.keep }}</b><span>维持体重</span></div>
      <div class="diet-item"><b>{{ portions.gain }}</b><span>增重期参考</span></div>
    </div>
  </div>

  <div class="panel mt-16">
    <p class="tip m-0">
      BMI 分级采用中国标准(WS/T 428-2013,超重切点 24);基础代谢按 Mifflin-St Jeor 公式估算。
      孕妇、儿童与肌肉量异常人群不适用 BMI 单一指标;热量数值均为估算,请以专业指导为准。
    </p>
  </div>
</template>

<style scoped>
.form-row {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
}
.ctrl {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.num-input {
  width: 120px;
  font-family: var(--mono);
}
.act-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.act-btn {
  font-size: 13px;
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
.stat-tag {
  margin-top: 8px;
  display: inline-block;
  font-size: 12.5px;
  padding: 2px 10px;
  border-radius: 999px;
}
.tone-info { background: var(--accent-soft); color: var(--accent); }
.tone-ok { background: rgba(21, 128, 61, 0.12); color: var(--success); }
.tone-warn { background: rgba(180, 83, 9, 0.12); color: var(--warning); }
.tone-danger { background: var(--danger-soft); color: var(--danger); }
.bmi-scale {
  padding: 4px 0;
}
.bmi-bar {
  position: relative;
  height: 12px;
  border-radius: 999px;
}
.bmi-marker {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--card);
  border: 4px solid var(--text);
  box-shadow: var(--shadow);
}
.bmi-ticks {
  display: flex;
  justify-content: space-between;
  font-family: var(--mono);
  font-size: 12px;
  color: var(--muted);
  margin-top: 6px;
  padding: 0 2px;
}
.diet-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
@media (max-width: 720px) {
  .diet-grid {
    grid-template-columns: 1fr;
  }
}
.diet-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: var(--bg-soft);
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 13.5px;
}
.diet-item b {
  font-family: var(--mono);
  font-size: 17px;
  color: var(--accent);
}
</style>
