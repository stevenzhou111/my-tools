import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { ReadableStream } from 'node:stream/web'
import { json, isBlockedHost, readTextCapped, fetchGuarded, withEdgeCache, MAX_REDIRECTS } from '../../functions/api/_shared.js'

function res(body, init = {}) {
  return new Response(body, init)
}

beforeEach(() => {
  vi.unstubAllGlobals()
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('json()', () => {
  it('默认 200 + max-age=300,可覆盖状态码与缓存时长', async () => {
    const ok = json({ a: 1 })
    expect(ok.status).toBe(200)
    expect(ok.headers.get('content-type')).toBe('application/json; charset=utf-8')
    expect(ok.headers.get('cache-control')).toBe('public, max-age=300')
    expect(await ok.json()).toEqual({ a: 1 })

    const err = json({ error: 'x' }, 403, 0)
    expect(err.status).toBe(403)
    expect(err.headers.get('cache-control')).toBe('public, max-age=0')
  })
})

describe('isBlockedHost()', () => {
  it.each([
    ['', true],
    ['localhost', true],
    ['foo.local', true],
    ['svc.internal', true],
    ['127.0.0.1', true],
    ['10.1.2.3', true],
    ['192.168.1.1', true],
    ['169.254.169.254', true],
    ['0.0.0.0', true],
    ['172.16.0.1', true],
    ['172.31.255.255', true],
    ['[::1]', true],
    ['172.32.0.1', false],
    ['172.15.0.1', false],
    ['example.com', false],
    ['8.8.8.8', false],
  ])('%s → %s', (host, blocked) => {
    expect(isBlockedHost(host)).toBe(blocked)
  })
})

describe('readTextCapped()', () => {
  it('未超限时完整返回', async () => {
    const out = await readTextCapped(res('hello 世界'), 100)
    expect(out).toBe('hello 世界')
  })

  it('超限按字节截断并 cancel 下游,不继续读剩余 chunk', async () => {
    let cancelled = false
    const stream = new ReadableStream({
      start(controller) {
        // 每块 100 字节,共 10 块;上限 250 字节 → 读 3 块后应停止
        for (let i = 0; i < 10; i++) controller.enqueue(new Uint8Array(100).fill(65))
        controller.close()
      },
      cancel() { cancelled = true },
    })
    const out = await readTextCapped(res(stream), 250)
    expect(out).toHaveLength(250)
    expect(cancelled).toBe(true)
  })

  it('无流式 body 时退化为 text() 截断', async () => {
    const out = await readTextCapped(res('abcdef'), 3)
    expect(out).toBe('abc')
  })
})

describe('fetchGuarded()', () => {
  const target = new URL('https://example.com/start')

  it('直连成功,透传响应与最终地址', async () => {
    const page = res('ok', { headers: { 'content-type': 'text/html' } })
    const spy = vi.fn().mockResolvedValue(page)
    vi.stubGlobal('fetch', spy)
    const { res: r, finalUrl } = await fetchGuarded(target, undefined, { accept: 'text/html' })
    expect(r).toBe(page)
    expect(finalUrl.href).toBe(target.href)
    expect(spy).toHaveBeenCalledWith(target.href, expect.objectContaining({ redirect: 'manual' }))
  })

  it('相对重定向按当前地址解析并跟随', async () => {
    const spy = vi.fn()
      .mockResolvedValueOnce(res(null, { status: 302, headers: { location: '/next' } }))
      .mockResolvedValueOnce(res('ok', { headers: { 'content-type': 'text/html' } }))
    vi.stubGlobal('fetch', spy)
    const { finalUrl } = await fetchGuarded(target, undefined, {})
    expect(finalUrl.href).toBe('https://example.com/next')
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('302 跳内网被拦截(每一跳都校验 host)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      res(null, { status: 302, headers: { location: 'http://127.0.0.1/admin' } }),
    ))
    await expect(fetchGuarded(target, undefined, {})).rejects.toMatchObject({ code: 'blocked' })
  })

  it('重定向到非 http/https 协议被拒绝', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      res(null, { status: 302, headers: { location: 'file:///etc/passwd' } }),
    ))
    await expect(fetchGuarded(target, undefined, {})).rejects.toMatchObject({ code: 'redirect' })
  })

  it('重定向次数超上限报错', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      res(null, { status: 302, headers: { location: 'https://example.com/hop' } }),
    ))
    await expect(fetchGuarded(target, undefined, {})).rejects.toMatchObject({ code: 'redirect' })
    // MAX_REDIRECTS 之后停止:上限 3 → 第 4 个请求未发出,共 4 次(hop 0..3)
    expect(vi.mocked(fetch).mock.calls).toHaveLength(MAX_REDIRECTS + 1)
  })

  it('3xx 但无 location 时原样返回', async () => {
    const redirect = res(null, { status: 304, headers: {} })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(redirect))
    const { res: r } = await fetchGuarded(target, undefined, {})
    expect(r).toBe(redirect)
  })
})

describe('withEdgeCache()', () => {
  function stubCaches() {
    const store = new Map()
    const cache = {
      match: vi.fn(async (req) => store.get(req.url) || undefined),
      put: vi.fn(async (req, res) => { store.set(req.url, res) }),
    }
    vi.stubGlobal('caches', { default: cache })
    return { cache, store }
  }

  it('命中缓存直接返回,不再执行 produce', async () => {
    const { cache, store } = stubCaches()
    const req = new Request('https://x.test/api?a=1')
    store.set(req.url, json({ cached: true }))
    let calls = 0
    const res = await withEdgeCache(req, undefined, async () => { calls++; return json({ fresh: true }) })
    expect(await res.json()).toEqual({ cached: true })
    expect(calls).toBe(0)
    expect(cache.match).toHaveBeenCalledWith(req)
  })

  it('200 响应写入缓存,经 ctx.waitUntil 异步完成', async () => {
    const { cache } = stubCaches()
    const waited = []
    const ctx = { waitUntil: (p) => waited.push(p) }
    const req = new Request('https://x.test/api?b=2')
    const res = await withEdgeCache(req, ctx, async () => json({ ok: 1 }))
    expect(res.status).toBe(200)
    await Promise.all(waited)
    expect(cache.put).toHaveBeenCalledTimes(1)
    expect((await cache.match(req)).ok).toBe(true) // Response.ok
  })

  it('非 200 响应不进缓存(错误不能被钉在边缘)', async () => {
    const { cache } = stubCaches()
    const req = new Request('https://x.test/api?c=3')
    await withEdgeCache(req, undefined, async () => json({ error: 'x' }, 502))
    expect(cache.put).not.toHaveBeenCalled()
  })

  it('无 caches 环境(本地 Node/单测)静默降级为直连', async () => {
    vi.stubGlobal('caches', undefined)
    const res = await withEdgeCache(new Request('https://x.test/api?d=4'), undefined, async () => json({ direct: true }))
    expect(await res.json()).toEqual({ direct: true })
  })

  it('cache.match 抛异常时降级为直连', async () => {
    vi.stubGlobal('caches', { default: { match: vi.fn(async () => { throw new Error('boom') }), put: vi.fn() } })
    const res = await withEdgeCache(new Request('https://x.test/api?e=5'), undefined, async () => json({ fallback: true }))
    expect(await res.json()).toEqual({ fallback: true })
  })
})
