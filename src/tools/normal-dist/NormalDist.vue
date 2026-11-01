<script setup>
import { computed, ref } from 'vue'
import { cdf, ppf, zScore } from '@/utils/normalDist'
import { useUrlState } from '@/utils/urlState'

const mode = ref('cdf') // cdf: x→概率;ppf: 概率→x
const mu = ref(0)
const sigma = ref(1)
const x = ref(1.96)
const p = ref(95) // 百分位(%)

const num = (lo, hi) => (s) => {
  const v = Number(s)
  return Number.isFinite(v) && v >= lo && v <= hi ? v : undefined
}
useUrlState([
  { key: 'm', ref: mode, parse: (s) => (['cdf', 'ppf'].includes(s) ? s : undefined) },
  { key: 'mu', ref: mu, parse: num(-1e9, 1e9) },
  { key: 'sd', ref: sigma, parse: num(0.0001, 1e9) },
  { key: 'x', ref: x, parse: num(-1e9, 1e9) },
  { key: 'p', ref: p, parse: num(0.01, 99.99) },
])

const fx = (v) => (+v.toFixed(6)).toString()

const cdfResult = computed(() => {
  try {
    const z = zScore(x.value, mu.value, sigma.value)
    const below = cdf(x.value, mu.value, sigma.value)
    return {
      error: '',
      z: fx(z),
      below: fx(below),
      above: fx(1 - below),
      belowPct: (below * 100).toFixed(2),
      abovePct: ((1 - below) * 100).toFixed(2),
    }
  } catch (e) {
    return { error: e.message }
  }
})

const ppfResult = computed(() => {
  try {
    const px = ppf(p.value / 100, mu.value, sigma.value)
    return { error: '', x: fx(px), z: fx(zScore(px, mu.value, sigma.value)) }
  } catch (e) {
    return { error: e.message }
  }
})

// 常用临界值速查(标准正态)
const COMMON = [
  { p: '90%', z: 1.6449 },
  { p: '95%', z: 1.9600 },
  { p: '99%', z: 2.5758 },
  { p: '99.9%', z: 3.2905 },
]
</script>

<template>
  <div class="panel mb-16">
    <div class="form-row">
      <div class="row gap-8" role="radiogroup" aria-label="计算方向">
        <button class="btn btn-sm" :class="{ 'btn-primary': mode === 'cdf' }" role="radio" :aria-checked="mode === 'cdf'" @click="mode = 'cdf'">X → 概率</button>
        <button class="btn btn-sm" :class="{ 'btn-primary': mode === 'ppf' }" role="radio" :aria-checked="mode === 'ppf'" @click="mode = 'ppf'">概率 → X</button>
      </div>
      <label class="ctrl">
        <span class="field-label m-0">均值 μ</span>
        <input v-model.number="mu" class="input num-input" type="number" step="0.1" />
      </label>
      <label class="ctrl">
        <span class="field-label m-0">标准差 σ</span>
        <input v-model.number="sigma" class="input num-input" type="number" min="0.0001" step="0.1" />
      </label>
      <label v-if="mode === 'cdf'" class="ctrl">
        <span class="field-label m-0">X 值</span>
        <input v-model.number="x" class="input num-input" type="number" step="0.1" />
      </label>
      <label v-else class="ctrl">
        <span class="field-label m-0">百分位 P(X ≤ x)(%)</span>
        <input v-model.number="p" class="input num-input" type="number" min="0.01" max="99.99" step="0.5" />
      </label>
    </div>
  </div>

  <template v-if="mode === 'cdf'">
    <div v-if="cdfResult.error" class="error-box mb-14">✗ {{ cdfResult.error }}</div>
    <template v-else>
      <div class="stat-grid">
        <div class="panel stat-card highlight">
          <div class="stat-value">{{ cdfResult.belowPct }}%</div>
          <div class="stat-label">P(X ≤ {{ x }})</div>
        </div>
        <div class="panel stat-card">
          <div class="stat-value">{{ cdfResult.abovePct }}%</div>
          <div class="stat-label">P(X &gt; {{ x }})</div>
        </div>
        <div class="panel stat-card">
          <div class="stat-value">z = {{ cdfResult.z }}</div>
          <div class="stat-label">标准化分数<span class="tip"> · (x − μ) / σ</span></div>
        </div>
      </div>

      <div class="panel mt-16">
        <p class="tip m-0 mb-10">常用参照(标准正态):</p>
        <div class="ref-row">
          <code v-for="c in COMMON" :key="c.p" class="ref-chip">P(Z ≤ {{ c.z }}) ≈ {{ c.p }}</code>
        </div>
        <p class="tip m-0 mt-10">
          经验法则:约 68% 的取值落在 μ ± 1σ 内,95% 在 μ ± 2σ 内,99.7% 在 μ ± 3σ 内(68-95-99.7 法则)。
          考试排名、质量控制(六西格玛)、置信区间都从这里来。
        </p>
      </div>
    </template>
  </template>

  <template v-else>
    <div v-if="ppfResult.error" class="error-box mb-14">✗ {{ ppfResult.error }}</div>
    <div v-else class="stat-grid">
      <div class="panel stat-card highlight">
        <div class="stat-value">{{ ppfResult.x }}</div>
        <div class="stat-label">x = {{ mu }} + zσ({{ p }}% 分位)</div>
      </div>
      <div class="panel stat-card">
        <div class="stat-value">z = {{ ppfResult.z }}</div>
        <div class="stat-label">对应标准正态分位数</div>
      </div>
      <div class="panel stat-card">
        <div class="stat-value">{{ (100 - p).toFixed(2) }}%</div>
        <div class="stat-label">右侧尾部 P(X &gt; x)</div>
      </div>
    </div>
  </template>

  <div class="panel mt-16">
    <p class="tip m-0">
      正态分布 N(μ, σ²):μ 决定中心位置,σ 决定离散程度。
      「X → 概率」适合算「某成绩超过多少人」「某尺寸落在公差内的比例」;「概率 → X」反推临界值,比如 95% 置信区间常用 z=1.96。
      计算用 erf 与 Acklam 分位数近似(误差小于 1e-6),教学与工程估算足够;显著性检验请以统计软件为准。
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
  width: 140px;
  font-family: var(--mono);
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
  font-size: 24px;
  font-weight: 700;
  color: var(--accent);
  word-break: break-all;
}
.stat-label {
  margin-top: 4px;
  font-size: 14px;
  color: var(--muted);
}
.ref-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.ref-chip {
  font-family: var(--mono);
  font-size: 13px;
  background: var(--bg-soft);
  border-radius: 8px;
  padding: 5px 12px;
}
</style>
