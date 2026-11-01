import { describe, expect, it, beforeEach, vi } from 'vitest'
import { onRequestGet, isBlockedHost } from '../../functions/api/fetch-meta.js'

function call(url) {
  return onRequestGet({ request: new Request(`http://localhost/api/fetch-meta?url=${encodeURIComponent(url)}`) })
}

const HTML_PAGE = `<!doctype html><html><head>
<title>文章 &amp; 指南</title>
<meta name="description" content="一篇关于 &lt;测试&gt; 的文章">
<meta property="og:title" content="OG 标题">
<meta property="og:image" content="https://cdn.example.com/cover.png">
</head><body><h1>正文标题</h1></body></html>`

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('fetch-meta · 入参校验', () => {
  it('非法 URL 返回 400', async () => {
    const res = await call('not a url')
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('URL')
  })

  it('拒绝非 http 协议', async () => {
    const res = await call('ftp://example.com/file')
    expect(res.status).toBe(400)
  })

  it('SSRF:拒绝内网与环回地址', async () => {
    for (const u of ['http://localhost/x', 'http://127.0.0.1/x', 'http://192.168.1.1/x', 'http://10.0.0.1/x', 'http://172.16.0.1/x', 'http://[::1]/x']) {
      const res = await call(u)
      expect(res.status, u).toBe(403)
    }
  })

  it('isBlockedHost 边界:172.15 放行、172.32 放行、公网放行', () => {
    expect(isBlockedHost('172.15.0.1')).toBe(false)
    expect(isBlockedHost('172.32.0.1')).toBe(false)
    expect(isBlockedHost('example.com')).toBe(false)
  })
})

describe('fetch-meta · 抓取与解析', () => {
  it('解析 title/description/og 字段并解码实体', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(HTML_PAGE, { headers: { 'content-type': 'text/html; charset=utf-8' } })))
    const res = await call('https://example.com/post')
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.ogTitle).toBe('OG 标题')
    expect(data.title).toBe('OG 标题') // og:title 优先
    expect(data.description).toBe('一篇关于 <测试> 的文章')
    expect(data.ogImage).toBe('https://cdn.example.com/cover.png')
    expect(data.h1).toBe('正文标题')
  })

  it('非 HTML 内容返回 415', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"a":1}', { headers: { 'content-type': 'application/json' } })))
    const res = await call('https://example.com/api')
    expect(res.status).toBe(415)
    expect((await res.json()).error).toContain('不是网页')
  })

  it('上游失败返回 502 与可读错误', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('boom') }))
    const res = await call('https://unreachable.example.com/x')
    expect(res.status).toBe(502)
    expect((await res.json()).error).toContain('boom')
  })
})
