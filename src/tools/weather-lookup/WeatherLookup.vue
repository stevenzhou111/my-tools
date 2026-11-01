<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { geocode, fetchWeather, wmoInfo } from '@/utils/weather'
import { useUrlState, shortString } from '@/utils/urlState'
import AppIcon from '@/components/AppIcon.vue'

const query = ref('')
const searching = ref(false)
const candidates = ref([])
const searchError = ref('')
const weather = ref(null)
const weatherError = ref('')
const loadingWeather = ref(false)

// 位置三要素进 URL:分享链接打开直接出天气
const cityName = ref('')
const lat = ref('')
const lon = ref('')

const num = (lo, hi) => (s) => {
  const v = Number(s)
  return Number.isFinite(v) && v >= lo && v <= hi ? v : undefined
}
useUrlState([
  { key: 'city', ref: cityName, parse: shortString(40) },
  { key: 'lat', ref: lat, parse: (s) => (num(-90, 90)(s) ?? '').toString() },
  { key: 'lon', ref: lon, parse: (s) => (num(-180, 180)(s) ?? '').toString() },
])

const place = computed(() => {
  const la = Number(lat.value)
  const lo = Number(lon.value)
  if (!Number.isFinite(la) || !Number.isFinite(lo) || lat.value === '' || lon.value === '') return null
  return { name: cityName.value || `${la.toFixed(2)}, ${lo.toFixed(2)}`, latitude: la, longitude: lo }
})

async function loadWeather(force = false) {
  if (!place.value) return
  loadingWeather.value = true
  weatherError.value = ''
  const r = await fetchWeather(place.value.latitude, place.value.longitude, { force })
  loadingWeather.value = false
  if (r.error && !r.current) {
    weatherError.value = r.error
    return
  }
  weather.value = r
}

// 坐标变化(搜索选择或 URL 回填)即加载;immediate 兜住 useUrlState 在 setup 期回填的初值
watch(() => [lat.value, lon.value], ([la, lo]) => {
  if (la !== '' && lo !== '') loadWeather()
}, { immediate: true })

async function search() {
  const q = query.value.trim()
  if (!q) return
  searching.value = true
  searchError.value = ''
  candidates.value = []
  const r = await geocode(q)
  searching.value = false
  if (r.error) {
    searchError.value = r.error
    return
  }
  if (!r.list.length) {
    searchError.value = '没有找到这个城市,换个名字试试(支持中文/拼音)'
    return
  }
  candidates.value = r.list
}

function pick(c) {
  candidates.value = []
  query.value = ''
  searchError.value = ''
  weather.value = null
  cityName.value = c.name
  lat.value = String(c.latitude)
  lon.value = String(c.longitude)
}

const cur = computed(() => (weather.value?.current ? { ...weather.value.current, ...wmoInfo(weather.value.current.code) } : null))
const placeText = computed(() => {
  if (!place.value) return ''
  return [place.value.admin1, place.value.country].filter(Boolean).join(' · ') || place.value.name
})
const cacheAgeText = computed(() => {
  if (!weather.value?.fetchedAt) return ''
  const mins = Math.max(0, Math.round((Date.now() - weather.value.fetchedAt) / 60000))
  return mins < 60 ? `${mins} 分钟前` : `${Math.round(mins / 60)} 小时前`
})

const dayLabel = (d) => {
  const date = new Date(`${d}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (date.getTime() === today.getTime()) return '今天'
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]
}
</script>

<template>
  <div class="online-banner panel mb-16">
    <AppIcon name="wifi" :size="15" />
    <span>本工具需要联网(Open-Meteo 开放数据,免费无密钥);查询记录仅缓存在本机浏览器。</span>
  </div>

  <div class="panel mb-16">
    <div class="search-row">
      <label class="search-wrap">
        <AppIcon name="search" :size="16" />
        <input
          v-model="query"
          class="input search-input"
          type="search"
          placeholder="输入城市名,如 北京 / Shanghai / Tokyo(回车搜索)"
          @keydown.enter="search"
        />
      </label>
      <button class="btn btn-primary" :disabled="searching || !query.trim()" @click="search">
        {{ searching ? '搜索中…' : '搜索城市' }}
      </button>
    </div>
    <p v-if="searchError" class="tip warn-tip m-0 mt-8">{{ searchError }}</p>
    <div v-if="candidates.length" class="cand-list">
      <button v-for="c in candidates" :key="c.id" type="button" class="cand-item" @click="pick(c)">
        <b>{{ c.name }}</b>
        <span class="tip">{{ [c.admin1, c.country].filter(Boolean).join(' · ') }}{{ c.latitude.toFixed(2) }}, {{ c.longitude.toFixed(2) }}</span>
      </button>
    </div>
  </div>

  <div v-if="weatherError" class="error-box mb-14">
    ✗ {{ weatherError }}
    <button class="btn btn-sm retry-btn" @click="loadWeather(true)">重试</button>
  </div>

  <template v-if="weather && cur">
    <div class="panel result-panel mb-16">
      <div class="now-row">
        <div class="now-main">
          <AppIcon :name="cur.icon" :size="52" class="now-icon" />
          <div>
            <div class="now-temp">{{ cur.temp }}°C</div>
            <div class="now-desc">{{ cur.label }} · 体感 {{ cur.feels }}°C</div>
          </div>
        </div>
        <div class="now-meta">
          <div class="meta-item"><AppIcon name="map-pin" :size="14" />{{ place.name }}<span class="tip">{{ placeText }}</span></div>
          <div class="meta-item"><AppIcon name="droplets" :size="14" />湿度 {{ cur.humidity }}%</div>
          <div class="meta-item"><AppIcon name="wind" :size="14" />风速 {{ cur.wind }} km/h</div>
          <div class="meta-item"><AppIcon name="clock" :size="14" />时区 {{ weather.timezone }}</div>
        </div>
      </div>
      <p v-if="weather.stale" class="tip stale-tip m-0 mt-8">⚠ 当前为缓存数据({{ cacheAgeText }}获取),网络恢复后点「刷新」更新。</p>
      <p v-else class="tip m-0 mt-8">数据{{ weather.fromCache ? `来自本地缓存(${cacheAgeText}获取)` : '刚从天气服务获取' }} · Open-Meteo</p>
      <button class="btn btn-sm mt-8" :disabled="loadingWeather" @click="loadWeather(true)">
        <AppIcon name="refresh-cw" :size="13" />刷新
      </button>
    </div>

    <div class="panel">
      <p class="m-0 mb-10"><b>未来 5 天</b></p>
      <div class="daily-grid">
        <div v-for="d in weather.daily" :key="d.date" class="day-card">
          <div class="day-label">{{ dayLabel(d.date) }}</div>
          <AppIcon :name="wmoInfo(d.code).icon" :size="26" class="day-icon" />
          <div class="day-desc">{{ wmoInfo(d.code).label }}</div>
          <div class="day-temp"><b>{{ Math.round(d.max) }}°</b> {{ Math.round(d.min) }}°</div>
        </div>
      </div>
    </div>
  </template>

  <div class="panel mt-16">
    <p class="tip m-0">
      数据来自 Open-Meteo 开放气象服务(免费无密钥),按所选城市时区返回;预报为模型输出,出门前请以气象台预报为准。
      天气结果按位置缓存 30 分钟,同城市反复查看不再重复请求。
    </p>
  </div>
</template>

<style scoped>
.online-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
  color: var(--muted);
  padding: 10px 16px;
  border-color: color-mix(in srgb, var(--warning) 35%, var(--border));
}
.search-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.search-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 240px;
  color: var(--muted);
}
.search-input {
  flex: 1;
}
.warn-tip {
  color: var(--warning);
}
.cand-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 10px;
}
.cand-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  background: var(--bg-soft);
  border: none;
  border-radius: 10px;
  padding: 9px 14px;
  cursor: pointer;
  text-align: left;
  color: var(--text);
}
.cand-item:hover {
  background: var(--accent-soft);
}
.result-panel {
  border-color: color-mix(in srgb, var(--accent) 40%, var(--border));
}
.now-row {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}
.now-main {
  display: flex;
  align-items: center;
  gap: 18px;
}
.now-icon {
  color: var(--accent);
}
.now-temp {
  font-family: var(--mono);
  font-size: 42px;
  font-weight: 700;
  line-height: 1.1;
}
.now-desc {
  color: var(--muted);
  font-size: 14.5px;
}
.now-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 14px;
}
.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--muted);
}
.meta-item .tip {
  margin-left: 6px;
}
.stale-tip {
  color: var(--warning);
}
.daily-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
}
@media (max-width: 720px) {
  .daily-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
.day-card {
  text-align: center;
  background: var(--bg-soft);
  border-radius: 12px;
  padding: 12px 8px;
}
.day-label {
  font-size: 13px;
  color: var(--muted);
}
.day-icon {
  color: var(--accent);
  margin: 8px 0 4px;
}
.day-desc {
  font-size: 13px;
}
.day-temp {
  font-family: var(--mono);
  font-size: 14.5px;
  margin-top: 4px;
}
.retry-btn {
  margin-left: 10px;
}
</style>
