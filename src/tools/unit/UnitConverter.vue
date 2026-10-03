<script setup>
import { computed, ref, watch } from 'vue'

const LENGTH_UNITS = [
  { id: 'mm', name: '毫米 (mm)', f: 0.001 },
  { id: 'cm', name: '厘米 (cm)', f: 0.01 },
  { id: 'm', name: '米 (m)', f: 1 },
  { id: 'km', name: '千米 (km)', f: 1000 },
  { id: 'in', name: '英寸 (in)', f: 0.0254 },
  { id: 'ft', name: '英尺 (ft)', f: 0.3048 },
  { id: 'yd', name: '码 (yd)', f: 0.9144 },
  { id: 'mi', name: '英里 (mi)', f: 1609.344 },
  { id: 'nmi', name: '海里 (nmi)', f: 1852 },
]

const WEIGHT_UNITS = [
  { id: 'mg', name: '毫克 (mg)', f: 1e-6 },
  { id: 'g', name: '克 (g)', f: 0.001 },
  { id: 'kg', name: '千克 (kg)', f: 1 },
  { id: 'jin', name: '斤', f: 0.5 },
  { id: 't', name: '吨 (t)', f: 1000 },
  { id: 'oz', name: '盎司 (oz)', f: 0.028349523125 },
  { id: 'lb', name: '磅 (lb)', f: 0.45359237 },
]

const DATA_UNITS = [
  { id: 'B', name: '字节 (B)', f: 1 },
  { id: 'KB', name: 'KB (1024 B)', f: 1024 },
  { id: 'MB', name: 'MB', f: 1024 ** 2 },
  { id: 'GB', name: 'GB', f: 1024 ** 3 },
  { id: 'TB', name: 'TB', f: 1024 ** 4 },
]

const SPEED_UNITS = [
  { id: 'mps', name: '米/秒 (m/s)', f: 1 },
  { id: 'kmh', name: '千米/时 (km/h)', f: 1 / 3.6 },
  { id: 'mph', name: '英里/时 (mph)', f: 0.44704 },
  { id: 'kn', name: '节 (kn)', f: 0.514444 },
]

const TEMP_UNITS = [
  { id: 'c', name: '摄氏度 (°C)' },
  { id: 'f', name: '华氏度 (°F)' },
  { id: 'k', name: '开尔文 (K)' },
]

const AREA_UNITS = [
  { id: 'mm2', name: '平方毫米 (mm²)', f: 1e-6 },
  { id: 'cm2', name: '平方厘米 (cm²)', f: 1e-4 },
  { id: 'm2', name: '平方米 (m²)', f: 1 },
  { id: 'mu', name: '亩', f: 666.6667 },
  { id: 'ha', name: '公顷 (ha)', f: 1e4 },
  { id: 'km2', name: '平方千米 (km²)', f: 1e6 },
  { id: 'in2', name: '平方英寸 (in²)', f: 0.00064516 },
  { id: 'ft2', name: '平方英尺 (ft²)', f: 0.09290304 },
  { id: 'ac', name: '英亩 (acre)', f: 4046.8564224 },
  { id: 'mi2', name: '平方英里 (mi²)', f: 2589988.110336 },
]

const VOLUME_UNITS = [
  { id: 'ml', name: '毫升 (mL)', f: 0.001 },
  { id: 'l', name: '升 (L)', f: 1 },
  { id: 'm3', name: '立方米 (m³)', f: 1000 },
  { id: 'in3', name: '立方英寸 (in³)', f: 0.016387064 },
  { id: 'ft3', name: '立方英尺 (ft³)', f: 28.316846592 },
  { id: 'cup', name: '杯 (美制)', f: 0.2365882365 },
  { id: 'qt', name: '夸脱 (美制)', f: 0.946352946 },
  { id: 'galus', name: '加仑 (美制)', f: 3.785411784 },
  { id: 'galuk', name: '加仑 (英制)', f: 4.54609 },
]

const TIME_UNITS = [
  { id: 'ms', name: '毫秒 (ms)', f: 0.001 },
  { id: 's', name: '秒 (s)', f: 1 },
  { id: 'min', name: '分钟 (min)', f: 60 },
  { id: 'h', name: '小时 (h)', f: 3600 },
  { id: 'd', name: '天 (d)', f: 86400 },
  { id: 'week', name: '周', f: 604800 },
  { id: 'month', name: '月(30天)', f: 2592000 },
  { id: 'year', name: '年(365天)', f: 31536000 },
]

const ANGLE_UNITS = [
  { id: 'deg', name: '度 (°)', f: 1 },
  { id: 'rad', name: '弧度 (rad)', f: 57.29577951308232 },
  { id: 'grad', name: '梯度 (gon)', f: 0.9 },
  { id: 'arcmin', name: '角分 (′)', f: 1 / 60 },
  { id: 'arcsec', name: '角秒 (″)', f: 1 / 3600 },
  { id: 'turn', name: '圆周 (turn)', f: 360 },
]

const PRESSURE_UNITS = [
  { id: 'pa', name: '帕斯卡 (Pa)', f: 1 },
  { id: 'kpa', name: '千帕 (kPa)', f: 1000 },
  { id: 'mpa', name: '兆帕 (MPa)', f: 1e6 },
  { id: 'bar', name: '巴 (bar)', f: 1e5 },
  { id: 'atm', name: '标准大气压 (atm)', f: 101325 },
  { id: 'torr', name: '托 (Torr)', f: 133.322368421 },
  { id: 'psi', name: '磅/平方英寸 (psi)', f: 6894.757293168 },
]

const ENERGY_UNITS = [
  { id: 'j', name: '焦耳 (J)', f: 1 },
  { id: 'kj', name: '千焦 (kJ)', f: 1000 },
  { id: 'cal', name: '卡路里 (cal)', f: 4.184 },
  { id: 'kcal', name: '千卡 (kcal)', f: 4184 },
  { id: 'wh', name: '瓦时 (Wh)', f: 3600 },
  { id: 'kwh', name: '千瓦时 (kWh)', f: 3.6e6 },
]

const POWER_UNITS = [
  { id: 'w', name: '瓦特 (W)', f: 1 },
  { id: 'kw', name: '千瓦 (kW)', f: 1000 },
  { id: 'mw', name: '兆瓦 (MW)', f: 1e6 },
  { id: 'hp', name: '马力(机械)', f: 745.6998716 },
]

const FREQ_UNITS = [
  { id: 'hz', name: '赫兹 (Hz)', f: 1 },
  { id: 'khz', name: '千赫 (kHz)', f: 1000 },
  { id: 'mhz', name: '兆赫 (MHz)', f: 1e6 },
  { id: 'ghz', name: '吉赫 (GHz)', f: 1e9 },
  { id: 'rpm', name: '转/分 (rpm)', f: 1 / 60 },
]

const CURRENT_UNITS = [
  { id: 'a', name: '安培 (A)', f: 1 },
  { id: 'ma', name: '毫安 (mA)', f: 0.001 },
  { id: 'ka', name: '千安 (kA)', f: 1000 },
]

const VOLTAGE_UNITS = [
  { id: 'v', name: '伏特 (V)', f: 1 },
  { id: 'mv', name: '毫伏 (mV)', f: 0.001 },
  { id: 'kv', name: '千伏 (kV)', f: 1000 },
]

const LUX_UNITS = [
  { id: 'lux', name: '勒克斯 (lx)', f: 1 },
  { id: 'klux', name: '千勒克斯 (klx)', f: 1000 },
  { id: 'ftcd', name: '英尺烛光 (ft-cd)', f: 10.7639104 },
]

// 配速:以 分/公里 为基准;min/mile、min/100m 按距离线性换算,
// 而速度(km/h、mph)与配速互为倒数,需要在换算时特殊处理
const PACE_UNITS = [
  { id: 'minkm', name: '分/公里 (min/km)', f: 1 },
  { id: 'minmi', name: '分/英里 (min/mile)', f: 1 / 1.609344 },
  { id: 'min100m', name: '分/100米', f: 10 },
  { id: 'kmh', name: '速度 (km/h)', f: 0 },
  { id: 'mph', name: '速度 (mph)', f: 0 },
]
// base(分/公里) = 系数 / v
const PACE_INVERSE = { kmh: 60, mph: 60 / 1.609344 }

const CATS = [
  { id: 'length', name: '长度', units: LENGTH_UNITS },
  { id: 'weight', name: '重量', units: WEIGHT_UNITS },
  { id: 'temp', name: '温度', units: TEMP_UNITS },
  { id: 'data', name: '数据存储', units: DATA_UNITS },
  { id: 'speed', name: '速度', units: SPEED_UNITS },
  { id: 'area', name: '面积', units: AREA_UNITS },
  { id: 'volume', name: '体积', units: VOLUME_UNITS },
  { id: 'time', name: '时间', units: TIME_UNITS },
  { id: 'angle', name: '角度', units: ANGLE_UNITS },
  { id: 'pressure', name: '压力', units: PRESSURE_UNITS },
  { id: 'energy', name: '能量', units: ENERGY_UNITS },
  { id: 'power', name: '功率', units: POWER_UNITS },
  { id: 'frequency', name: '频率', units: FREQ_UNITS },
  { id: 'current', name: '电流', units: CURRENT_UNITS },
  { id: 'voltage', name: '电压', units: VOLTAGE_UNITS },
  { id: 'lux', name: '光照度', units: LUX_UNITS },
  { id: 'pace', name: '配速', units: PACE_UNITS },
]

const cat = ref('length')
const value = ref('1')
const from = ref('m')
const to = ref('ft')

watch(cat, () => {
  const units = CATS.find((c) => c.id === cat.value).units
  from.value = units[0].id
  to.value = units[1].id
}, { immediate: true })

const unitOptions = computed(() => CATS.find((c) => c.id === cat.value).units)

function toBase(v, unitId) {
  const num = Number(v)
  if (cat.value === 'temp') {
    if (unitId === 'c') return num
    if (unitId === 'f') return ((num - 32) * 5) / 9
    return num - 273.15
  }
  if (cat.value === 'pace' && unitId in PACE_INVERSE) {
    return num === 0 ? Infinity : PACE_INVERSE[unitId] / num
  }
  return num * unitOptions.value.find((u) => u.id === unitId).f
}

function fromBase(v, unitId) {
  if (cat.value === 'temp') {
    if (unitId === 'c') return v
    if (unitId === 'f') return (v * 9) / 5 + 32
    return v + 273.15
  }
  if (cat.value === 'pace' && unitId in PACE_INVERSE) {
    return v === 0 ? Infinity : PACE_INVERSE[unitId] / v
  }
  return v / unitOptions.value.find((u) => u.id === unitId).f
}

function formatNum(n) {
  if (!Number.isFinite(n)) return '—'
  if (n === 0) return '0'
  const abs = Math.abs(n)
  if (abs >= 1e15 || abs < 1e-9) return n.toExponential(6)
  return String(parseFloat(n.toPrecision(12)))
}

const result = computed(() => {
  const v = Number(value.value)
  if (value.value.trim() === '' || Number.isNaN(v)) return null
  const base = toBase(v, from.value)
  return { text: formatNum(fromBase(base, to.value)) }
})

function swap() {
  const t = from.value
  from.value = to.value
  to.value = t
}
</script>

<template>
  <div class="panel">
    <div class="field">
      <label class="field-label">类别</label>
      <select v-model="cat" class="select">
        <option v-for="c in CATS" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
    </div>

    <div class="field">
      <label class="field-label">数值</label>
      <input v-model="value" class="input" type="text" placeholder="输入数值" spellcheck="false" />
    </div>

    <div class="unit-row">
      <div class="field" style="flex: 1; margin: 0">
        <label class="field-label">从</label>
        <select v-model="from" class="select">
          <option v-for="u in unitOptions" :key="u.id" :value="u.id">{{ u.name }}</option>
        </select>
      </div>
      <button class="btn swap-btn" title="交换单位" @click="swap">⇄</button>
      <div class="field" style="flex: 1; margin: 0">
        <label class="field-label">到</label>
        <select v-model="to" class="select">
          <option v-for="u in unitOptions" :key="u.id" :value="u.id">{{ u.name }}</option>
        </select>
      </div>
    </div>

    <div v-if="result" class="result-box">
      <span class="result-label">结果</span>
      <strong class="result-value">{{ result.text }}</strong>
    </div>

    <p v-if="cat === 'data'" class="tip" style="margin-top: 10px">
      数据存储按二进制换算 (1 KB = 1024 B)。
    </p>
  </div>
</template>

<style scoped>
.unit-row {
  display: flex;
  gap: 10px;
  align-items: end;
}
.swap-btn {
  height: 40px;
  flex-shrink: 0;
}
.result-box {
  margin-top: 16px;
  padding: 16px;
  background: var(--accent-soft);
  border: 1px solid var(--border);
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.result-label {
  color: var(--muted);
  font-size: 14px;
  flex-shrink: 0;
}
.result-value {
  font-size: 24px;
  color: var(--accent);
  word-break: break-all;
}
</style>
