/**
 * 天气查询:Open-Meteo(免费、无密钥、支持 CORS)。
 * 城市搜索用其地理编码接口,天气用逐小时/逐日预报接口;
 * 结果按位置缓存 30 分钟(localStorage),断网回退旧缓存并标记 stale。
 */

const GEO_API = 'https://geocoding-api.open-meteo.com/v1/search'
const WEATHER_API = 'https://api.open-meteo.com/v1/forecast'
const GEO_TTL = 60 * 60 * 1000
const WEATHER_TTL = 30 * 60 * 1000

/** WMO 天气代码 → 描述与图标(lucide) */
export const WMO = {
  0: { label: '晴', icon: 'sun' },
  1: { label: '大致晴朗', icon: 'cloud-sun' },
  2: { label: '多云', icon: 'cloudy' },
  3: { label: '阴', icon: 'cloud' },
  45: { label: '雾', icon: 'cloud-fog' },
  48: { label: '冻雾', icon: 'cloud-fog' },
  51: { label: '小毛毛雨', icon: 'cloud-drizzle' },
  53: { label: '毛毛雨', icon: 'cloud-drizzle' },
  55: { label: '大毛毛雨', icon: 'cloud-drizzle' },
  56: { label: '冻毛毛雨', icon: 'cloud-drizzle' },
  57: { label: '强冻毛毛雨', icon: 'cloud-drizzle' },
  61: { label: '小雨', icon: 'cloud-rain' },
  63: { label: '中雨', icon: 'cloud-rain' },
  65: { label: '大雨', icon: 'cloud-rain' },
  66: { label: '冻雨', icon: 'cloud-rain' },
  67: { label: '强冻雨', icon: 'cloud-rain' },
  71: { label: '小雪', icon: 'cloud-snow' },
  73: { label: '中雪', icon: 'cloud-snow' },
  75: { label: '大雪', icon: 'cloud-snow' },
  77: { label: '雪粒', icon: 'cloud-snow' },
  80: { label: '小阵雨', icon: 'cloud-rain-wind' },
  81: { label: '阵雨', icon: 'cloud-rain-wind' },
  82: { label: '强阵雨', icon: 'cloud-rain-wind' },
  85: { label: '小阵雪', icon: 'cloud-snow' },
  86: { label: '大阵雪', icon: 'cloud-snow' },
  95: { label: '雷阵雨', icon: 'cloud-lightning' },
  96: { label: '雷阵雨伴冰雹', icon: 'cloud-hail' },
  99: { label: '强雷阵雨伴冰雹', icon: 'cloud-hail' },
}

export function wmoInfo(code) {
  return WMO[code] || { label: `未知(${code})`, icon: 'cloud' }
}

function cacheKey(prefix, key) {
  return `toolbox-${prefix}:${key}`
}

function readCache(key, now, ttl) {
  try {
    const v = JSON.parse(localStorage.getItem(key) || 'null')
    if (v && typeof v.fetchedAt === 'number') {
      return { ...v, fresh: now - v.fetchedAt < ttl }
    }
  } catch { /* 忽略 */ }
  return null
}

function writeCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch { /* 忽略 */ }
}

/** 城市地理编码:返回候选列表(最多 5 个) */
export async function geocode(query, { now = Date.now() } = {}) {
  const q = String(query || '').trim()
  if (!q) return { error: '', list: [], stale: false }
  const key = cacheKey('geo', q)
  const cached = readCache(key, now, GEO_TTL)
  if (cached?.fresh) return { error: '', list: cached.list, stale: false, fromCache: true }
  try {
    const res = await fetch(`${GEO_API}?name=${encodeURIComponent(q)}&count=5&language=zh&format=json`)
    if (!res.ok) throw new Error(`服务返回 ${res.status}`)
    const data = await res.json()
    const list = (data.results || []).map((r) => ({
      id: r.id,
      name: r.name,
      country: r.country || '',
      admin1: r.admin1 || '',
      latitude: r.latitude,
      longitude: r.longitude,
      timezone: r.timezone || 'auto',
    }))
    writeCache(key, { list, fetchedAt: now })
    return { error: '', list, stale: false, fromCache: false }
  } catch (e) {
    if (cached) return { error: `网络获取失败(${e.message}),已回退缓存`, list: cached.list, stale: true }
    return { error: `城市搜索失败:${e.message}`, list: [], stale: false }
  }
}

/** 天气预报:current + 未来 5 天 */
export async function fetchWeather(lat, lon, { now = Date.now() } = {}) {
  const key = cacheKey('weather', `${lat},${lon}`)
  const cached = readCache(key, now, WEATHER_TTL)
  if (cached?.fresh) return { ...cached, stale: false, fromCache: true, error: '' }
  try {
    const url = `${WEATHER_API}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`服务返回 ${res.status}`)
    const data = await res.json()
    if (!data?.current || !data?.daily) throw new Error('返回数据格式异常')
    const out = {
      current: {
        temp: data.current.temperature_2m,
        feels: data.current.apparent_temperature,
        humidity: data.current.relative_humidity_2m,
        wind: data.current.wind_speed_10m,
        code: data.current.weather_code,
        time: data.current.time,
      },
      timezone: data.timezone,
      daily: (data.daily.time || []).map((d, i) => ({
        date: d,
        code: data.daily.weather_code[i],
        max: data.daily.temperature_2m_max[i],
        min: data.daily.temperature_2m_min[i],
      })),
      fetchedAt: now,
    }
    writeCache(key, out)
    return { ...out, stale: false, fromCache: false, error: '' }
  } catch (e) {
    if (cached) return { ...cached, stale: true, fromCache: true, error: `网络获取失败(${e.message}),已回退缓存` }
    return { error: `天气获取失败:${e.message}。请检查网络后重试;本工具需要联网。` }
  }
}
