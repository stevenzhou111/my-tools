import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { ReadableStream } from 'node:stream/web'
import { json, isBlockedHost, readTextCapped, fetchGuarded, MAX_REDIRECTS } from '../../functions/api/_shared.js'

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
