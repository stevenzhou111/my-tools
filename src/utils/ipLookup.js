/**
 * IP 归属地查询:多源降级(ipwho.is 主 → ip.sb 备),免费无密钥、支持 CORS。
 * 支持查本机公网 IP 与任意 IPv4/IPv6;结果缓存 10 分钟。
 */

const SOURCES = [
  { id: 'ipwho', name: 'ipwho.is', url: (ip) => (ip ? `https://ipwho.is/${encodeURIComponent(ip)}` : 'https://ipwho.is/') },
  { id: 'ipsb', name: 'ip.sb', url: (ip) => (ip ? `https://api.ip.sb/geoip/${encodeURIComponent(ip)}` : 'https://api.ip.sb/geoip') },
]

const TTL_MS = 10 * 60 * 1000

function cacheKey(ip) {
  return `toolbox-ip:${ip || 'self'}`
}

function readCache(key, now) {
  try {
    const v = JSON.parse(localStorage.getItem(key) || 'null')
    if (v && typeof v.fetchedAt === 'number') return { ...v, fresh: now - v.fetchedAt < TTL_MS }
  } catch { /* 忽略 */ }
  return null
}

function writeCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch { /* 忽略 */ }
}

/** 两个源的字段结构不同,统一归一化 */
function normalize(raw) {
  if (!raw || raw.success === false) return null
  const ip = raw.ip || raw.query || ''
  if (!ip) return null
  const conn = raw.connection || {}
  const tz = raw.timezone || {}
  return {
    ip,
    type: raw.type || '',
    country: raw.country || raw.country_name || '',
    countryCode: raw.country_code || '',
    region: raw.region || raw.regionName || '',
    city: raw.city || '',
    latitude: raw.latitude,
    longitude: raw.longitude,
    isp: conn.isp || raw.org || raw.asn?.org || '',
    timezone: tz.id || raw.timezone || '',
    utcOffset: tz.utc ?? raw.utc_offset ?? '',
  }
}

const IPV4_RE = /^(\d{1,3}\.){3}\d{1,3}$/
const IPV6_RE = /^[0-9a-fA-F:]+$/

/** 输入校验:空 = 查本机;否则需像 IP */
export function validateIp(input) {
  const s = String(input || '').trim()
  if (!s) return { ok: true, ip: '' }
  if (IPV4_RE.test(s)) {
    const ok = s.split('.').every((seg) => Number(seg) <= 255)
    return ok ? { ok: true, ip: s } : { ok: false, error: 'IPv4 每段不能超过 255' }
  }
  if (s.includes(':') && IPV6_RE.test(s)) return { ok: true, ip: s }
  return { ok: false, error: '请输入合法的 IPv4 / IPv6 地址,或留空查本机' }
}

/**
 * 查询归属地。
 * @returns {Promise<{error:string, data:object|null, source:string, stale:boolean, fetchedAt:number}>}
 */
export async function lookupIp(input = '', { now = Date.now() } = {}) {
  const v = validateIp(input)
  if (!v.ok) return { error: v.error, data: null, source: '', stale: false, fetchedAt: 0 }
  const key = cacheKey(v.ip)
  const cached = readCache(key, now)
  if (cached?.fresh) return { error: '', data: cached.data, source: cached.source, stale: false, fetchedAt: cached.fetchedAt }

  let lastErr = ''
  for (const src of SOURCES) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 6000)
    try {
      const res = await fetch(src.url(v.ip), { signal: ctrl.signal })
      clearTimeout(timer)
      if (!res.ok) throw new Error(`返回 ${res.status}`)
      const raw = await res.json()
      const data = normalize(raw)
      if (!data) throw new Error(raw?.message || '返回数据异常')
      const out = { data, source: src.name, fetchedAt: now }
      writeCache(key, out)
      return { error: '', ...out, stale: false }
    } catch (e) {
      clearTimeout(timer)
      lastErr = e.name === 'AbortError' ? '超时' : e.message
    }
  }
  if (cached) {
    return { error: `所有查询源都失败(${lastErr}),已回退缓存`, data: cached.data, source: cached.source, stale: true, fetchedAt: cached.fetchedAt }
  }
  return { error: `查询失败:所有查询源均不可达(${lastErr})。请检查网络后重试;本工具需要联网。`, data: null, source: '', stale: false, fetchedAt: 0 }
}
