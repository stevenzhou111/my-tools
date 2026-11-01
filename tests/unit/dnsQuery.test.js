import { describe, expect, it, beforeEach, vi } from 'vitest'
import { resolveDns, DNS_TYPES, statusText } from '@/utils/dnsQuery'

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

const MOCK_ANSWER = {
  Status: 0,
  Answer: [
    { name: 'github.com.', type: 1, TTL: 30, data: '20.205.243.166' },
    { name: 'github.com.', type: 1, TTL: 30, data: '20.27.177.113' },
  ],
}

describe('dnsQuery · 基础', () => {
  it('类型表齐全', () => {
    expect(DNS_TYPES.map((t) => t.id)).toEqual(['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT', 'SOA', 'CAA'])
  })

  it('状态码文案', () => {
    expect(statusText(0)).toContain('NOERROR')
    expect(statusText(3)).toContain('NXDOMAIN')
    expect(statusText(99)).toContain('99')
  })

  it('非法域名直接拒绝,不发请求', async () => {
    const spy = vi.fn()
    vi.stubGlobal('fetch', spy)
    const r = await resolveDns('不是域名')
    expect(r.error).toContain('合法的域名')
    expect(spy).not.toHaveBeenCalled()
  })
})

describe('dnsQuery · 多源解析', () => {
  it('主源(阿里)可用时直接返回,不请求 Google', async () => {
    const spy = vi.fn(async () => ({ ok: true, json: async () => MOCK_ANSWER }))
    vi.stubGlobal('fetch', spy)
    const r = await resolveDns('github.com', 'A')
    expect(r.error).toBe('')
    expect(r.status).toBe(0)
    expect(r.source).toBe('阿里 DNS')
    expect(r.records).toHaveLength(2)
    expect(r.records[0].data).toBe('20.205.243.166')
    // 只调用了第一个源
    expect(spy.mock.calls[0][0]).toContain('dns.alidns.com')
  })

  it('主源失败自动切换到 Google', async () => {
    const spy = vi.fn(async (url) => {
      if (String(url).includes('alidns')) throw new TypeError('network down')
      return { ok: true, json: async () => MOCK_ANSWER }
    })
    vi.stubGlobal('fetch', spy)
    const r = await resolveDns('github.com', 'A')
    expect(r.source).toBe('Google DNS')
    expect(r.records).toHaveLength(2)
  })

  it('NXDOMAIN 正常呈现(不算错误)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ Status: 3 }) })))
    const r = await resolveDns('no-such.example.com', 'A')
    expect(r.error).toBe('')
    expect(r.status).toBe(3)
    expect(r.records).toEqual([])
  })

  it('全部源失败且无缓存:返回可读错误', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    const r = await resolveDns('github.com', 'A')
    expect(r.error).toContain('所有解析源')
    expect(r.status).toBe(-1)
  })
})

describe('dnsQuery · 缓存', () => {
  it('5 分钟内命中缓存', async () => {
    const now = 1e12
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => MOCK_ANSWER })))
    await resolveDns('github.com', 'A', { now })
    const spy = vi.fn()
    vi.stubGlobal('fetch', spy)
    const r = await resolveDns('github.com', 'A', { now: now + 60 * 1000 })
    expect(r.stale).toBe(false)
    expect(spy).not.toHaveBeenCalled()
  })

  it('过期后断网回退缓存标记 stale', async () => {
    const now = 1e12
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => MOCK_ANSWER })))
    await resolveDns('github.com', 'A', { now })
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    const r = await resolveDns('github.com', 'A', { now: now + 10 * 60 * 1000 })
    expect(r.stale).toBe(true)
    expect(r.records).toHaveLength(2)
  })

  it('不同类型各自缓存', async () => {
    const now = 1e12
    const spy = vi.fn(async () => ({ ok: true, json: async () => MOCK_ANSWER }))
    vi.stubGlobal('fetch', spy)
    await resolveDns('github.com', 'A', { now })
    await resolveDns('github.com', 'MX', { now })
    expect(spy).toHaveBeenCalledTimes(2)
  })
})
