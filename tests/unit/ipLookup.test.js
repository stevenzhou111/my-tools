import { describe, expect, it, beforeEach, vi } from 'vitest'
import { lookupIp, validateIp } from '@/utils/ipLookup'

const RAW_IPWHO = {
  ip: '8.8.8.8', success: true, type: 'IPv4', country: 'United States', country_code: 'US',
  region: 'California', city: 'San Jose', latitude: 37.34, longitude: -121.89,
  connection: { isp: 'Google LLC' }, timezone: { id: 'America/Los_Angeles', utc: '-08:00' },
}

// ip.sb 的字段结构不同,验证归一化兼容
const RAW_IPSB = {
  ip: '8.8.8.8', country_name: 'United States', regionName: 'California', city: 'San Jose',
  latitude: 37.34, longitude: -121.89, org: 'Google LLC', timezone: 'America/Los_Angeles', offset: '-08:00',
}

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('ipLookup · 输入校验', () => {
  it('留空 = 查本机', () => {
    expect(validateIp('')).toEqual({ ok: true, ip: '' })
  })
  it('合法 IPv4 / IPv6', () => {
    expect(validateIp('8.8.8.8').ok).toBe(true)
    expect(validateIp('2606:4700::1111').ok).toBe(true)
  })
  it('非法输入', () => {
    expect(validateIp('300.1.1.1').ok).toBe(false)
    expect(validateIp('abc').ok).toBe(false)
  })
})

describe('ipLookup · 多源与归一化', () => {
  it('主源 ipwho.is 成功', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => RAW_IPWHO })))
    const r = await lookupIp('8.8.8.8')
    expect(r.error).toBe('')
    expect(r.source).toBe('ipwho.is')
    expect(r.data).toMatchObject({ ip: '8.8.8.8', country: 'United States', isp: 'Google LLC', timezone: 'America/Los_Angeles' })
  })

  it('主源失败切换 ip.sb,字段结构差异被归一化', async () => {
    const spy = vi.fn(async (url) => {
      if (String(url).includes('ipwho.is')) throw new TypeError('down')
      return { ok: true, json: async () => RAW_IPSB }
    })
    vi.stubGlobal('fetch', spy)
    const r = await lookupIp('8.8.8.8')
    expect(r.source).toBe('ip.sb')
    expect(r.data.isp).toBe('Google LLC')
    expect(r.data.city).toBe('San Jose')
  })

  it('查询源返回 success:false(无效 IP)算失败并降级', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ success: false, message: 'Invalid IP' }) })))
    const r = await lookupIp('8.8.8.8')
    expect(r.error).toContain('所有查询源')
  })

  it('查本机:请求不带 IP 段', async () => {
    const spy = vi.fn(async () => ({ ok: true, json: async () => RAW_IPWHO }))
    vi.stubGlobal('fetch', spy)
    await lookupIp('')
    expect(spy.mock.calls[0][0]).toBe('https://ipwho.is/')
  })
})

describe('ipLookup · 缓存', () => {
  it('10 分钟内命中缓存,不同 IP 各自缓存', async () => {
    const now = 1e12
    const spy = vi.fn(async () => ({ ok: true, json: async () => RAW_IPWHO }))
    vi.stubGlobal('fetch', spy)
    await lookupIp('8.8.8.8', { now })
    await lookupIp('8.8.8.8', { now: now + 5 * 60 * 1000 })
    await lookupIp('1.1.1.1', { now: now + 5 * 60 * 1000 })
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('过期后断网回退缓存标记 stale', async () => {
    const now = 1e12
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => RAW_IPWHO })))
    await lookupIp('8.8.8.8', { now })
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    const r = await lookupIp('8.8.8.8', { now: now + 20 * 60 * 1000 })
    expect(r.stale).toBe(true)
    expect(r.data.ip).toBe('8.8.8.8')
  })
})
