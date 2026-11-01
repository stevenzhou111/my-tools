import { describe, expect, it, beforeEach, vi } from 'vitest'
import { onRequestGet, parseFeed, isBlockedHost } from '../../functions/api/rss.js'

function call(url) {
  return onRequestGet({ request: new Request(`http://localhost/api/rss?url=${encodeURIComponent(url)}`) })
}

const RSS20 = `<?xml version="1.0"?>
<rss version="2.0"><channel>
<title>工具箱博客<![CDATA[ & 更多]]></title>
<link>https://blog.example.com</link>
<item>
  <title>第一篇 &amp; 有引号</title>
  <link>https://blog.example.com/1</link>
  <pubDate>Mon, 26 Oct 2026 08:00:00 GMT</pubDate>
  <description><![CDATA[<p>这是 <b>第一篇</b> 的摘要</p>]]></description>
</item>
<item>
  <title>第二篇</title>
  <link>https://blog.example.com/2</link>
  <guid>https://blog.example.com/2</guid>
  <description>纯文本摘要</description>
</item>
</channel></rss>`

const ATOM = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
<title>Atom 源</title>
<link rel="alternate" href="https://atom.example.com"/>
<entry>
  <title>条目甲</title>
  <link rel="alternate" href="https://atom.example.com/a"/>
  <updated>2026-10-30T10:00:00Z</updated>
  <summary>甲的摘要</summary>
</entry>
</feed>`

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('rss · parseFeed', () => {
  it('RSS 2.0:频道标题、CDATA 剥离、HTML 清理、guid 兜底', () => {
    const f = parseFeed(RSS20)
    expect(f.title).toBe('工具箱博客 & 更多')
    expect(f.items).toHaveLength(2)
    expect(f.items[0].title).toBe('第一篇 & 有引号')
    expect(f.items[0].link).toBe('https://blog.example.com/1')
    expect(f.items[0].summary).toBe('这是 第一篇 的摘要')
    // 第二条没有 link,用 guid 兜底
    expect(f.items[1].link).toBe('https://blog.example.com/2')
  })

  it('Atom:href 属性取链接,updated 作日期', () => {
    const f = parseFeed(ATOM)
    expect(f.title).toBe('Atom 源')
    expect(f.items[0].link).toBe('https://atom.example.com/a')
    expect(f.items[0].summary).toBe('甲的摘要')
  })

  it('50 条截断', () => {
    const many = Array.from({ length: 60 }, (_, i) => `<item><title>t${i}</title></item>`).join('')
    const f = parseFeed(`<rss><channel>${many}</channel></rss>`)
    expect(f.items).toHaveLength(50)
  })
})

describe('rss · handler', () => {
  it('非法 URL / 非法协议 / 内网地址拒绝', async () => {
    expect((await call('abc')).status).toBe(400)
    expect((await call('ftp://x.com/rss')).status).toBe(400)
    expect((await call('http://127.0.0.1/rss')).status).toBe(403)
  })

  it('正常抓取并返回 JSON', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(RSS20, { headers: { 'content-type': 'application/rss+xml' } })))
    const res = await call('https://blog.example.com/rss')
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.title).toContain('工具箱博客')
    expect(data.count).toBe(2)
    expect(data.items[0].link).toBe('https://blog.example.com/1')
  })

  it('非 RSS 内容返回 415', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html><body>不是源</body></html>', { headers: { 'content-type': 'text/html' } })))
    const res = await call('https://example.com/')
    expect(res.status).toBe(415)
  })

  it('内网防护与 fetch-meta 一致', () => {
    expect(isBlockedHost('169.254.1.1')).toBe(true)
    expect(isBlockedHost('example.com')).toBe(false)
  })
})
