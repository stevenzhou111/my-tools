/**
 * DNS 记录查询:DoH JSON 接口,多源降级(阿里 → 谷歌),
 * 两家都免费、无密钥、返回 Access-Control-Allow-Origin:*。
 * 结果按 (域名,类型) 缓存 5 分钟,断网回退旧缓存并标记 stale。
 */

const SOURCES = [
  { id: 'alidns', name: '阿里 DNS', url: (n, t) => `https://dns.alidns.com/resolve?name=${encodeURIComponent(n)}&type=${t}` },
  { id: 'google', name: 'Google DNS', url: (n, t) => `https://dns.google/resolve?name=${encodeURIComponent(n)}&type=${t}` },
]

export const DNS_TYPES = [
  { id: 'A', label: 'A(IPv4)' },
  { id: 'AAAA', label: 'AAAA(IPv6)' },
  { id: 'CNAME', label: 'CNAME(别名)' },
  { id: 'MX', label: 'MX(邮件)' },
  { id: 'NS', label: 'NS(域名服务器)' },
  { id: 'TXT', label: 'TXT(文本/SPF)' },
  { id: 'SOA', label: 'SOA(权威信息)' },
  { id: 'CAA', label: 'CAA(CA 授权)' },
]

const STATUS_TEXT = {
  0: 'NOERROR(查询成功)',
  1: 'FORMERR(请求格式错误)',
  2: 'SERVFAIL(服务端失败)',
  3: 'NXDOMAIN(域名不存在)',
  4: 'NOTIMP(不支持该类型)',
  5: 'REFUSED(拒绝应答)',
}

export function statusText(code) {
  return STATUS_TEXT[code] ?? `未知状态 ${code}`
}

const TTL_MS = 5 * 60 * 1000

function cacheKey(name, type) {
  return `toolbox-dns:${name.toLowerCase()}:${type}`
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

function domainOk(name) {
  // 域名或 IPv4/IPv6 字面量:宽松校验,交给 DNS 服务器判定
  return /^[\w.-]+\.[a-zA-Z]{2,}$/.test(name) || /^[\d.:a-fA-F]+$/.test(name)
}

/**
 * 查询 DNS 记录:逐个数据源尝试(6 秒超时),全部失败且有缓存则回退。
 * @returns {Promise<{error:string, status:number, records:{name,type,TTL,data}[], source:string, stale:boolean, fetchedAt:number}>}
 */
export async function resolveDns(name, type = 'A', { now = Date.now() } = {}) {
  const host = String(name || '').trim().replace(/\.$/, '')
  if (!host || !domainOk(host)) {
    return { error: '请输入合法的域名(如 example.com)', status: -1, records: [], source: '', stale: false, fetchedAt: 0 }
  }
  const key = cacheKey(host, type)
  const cached = readCache(key, now)
  if (cached?.fresh) return { ...cached, stale: false }

  let lastErr = ''
  for (const src of SOURCES) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 6000)
    try {
      const res = await fetch(src.url(host, type), { signal: ctrl.signal })
      clearTimeout(timer)
      if (!res.ok) throw new Error(`返回 ${res.status}`)
      const data = await res.json()
      if (typeof data?.Status !== 'number') throw new Error('返回格式异常')
      const records = (data.Answer || []).map((a) => ({ name: a.name, type: a.type, TTL: a.TTL, data: a.data }))
      const out = {
        status: data.Status,
        records,
        source: src.name,
        fetchedAt: now,
      }
      writeCache(key, out)
      return { ...out, stale: false, error: '' }
    } catch (e) {
      clearTimeout(timer)
      lastErr = e.name === 'AbortError' ? '超时' : e.message
    }
  }
  if (cached) {
    return { ...cached, stale: true, error: `所有解析源都失败(${lastErr}),已回退缓存` }
  }
  return {
    error: `查询失败:所有解析源均不可达(${lastErr})。请检查网络后重试;本工具需要联网。`,
    status: -1,
    records: [],
    source: '',
    stale: false,
    fetchedAt: 0,
  }
}
