/**
 * /api/fetch-meta?url= — 抓取网页并提取元信息(标题/描述/og:image)。
 * 免费档 Pages Functions,纯计算无存储;带 SSRF 防护、超时与响应体上限。
 * SSRF/重定向/截断等安全关键逻辑在 ./_shared.js,本文件只保留解析。
 */

import { json, isBlockedHost, readTextCapped, fetchGuarded, withEdgeCache } from './_shared.js'

// 测试与入口校验都引用这一个实现
export { isBlockedHost }

const MAX_BYTES = 400_000 // 只解析前 400KB,防止巨型页面拖垮 Worker
const UA = 'Mozilla/5.0 (compatible; ToolboxBot/1.0; +link preview)'
const ACCEPT = 'text/html,application/xhtml+xml'

function decodeEntities(s) {
  return String(s || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim()
    .slice(0, 500)
}

function pickMeta(html, re) {
  const m = re.exec(html)
  return m ? decodeEntities(m[1]) : ''
}

export async function onRequestGet({ request, ctx }) {
  return withEdgeCache(request, ctx, async () => {
    const { searchParams } = new URL(request.url)
    const url = (searchParams.get('url') || '').trim()
    let target
    try {
      target = new URL(url)
    } catch {
      return json({ error: 'URL 不合法' }, 400)
    }
    if (!/^https?:$/.test(target.protocol)) return json({ error: '仅支持 http/https 地址' }, 400)
    if (isBlockedHost(target.hostname)) return json({ error: '不允许访问内网/本地地址' }, 403)

    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 9000)
    try {
      const { res, finalUrl } = await fetchGuarded(target, ctrl.signal, { 'user-agent': UA, accept: ACCEPT })
      const ctype = res.headers.get('content-type') || ''
      if (!/text\/html/i.test(ctype)) {
        return json({ error: `该地址不是网页(${ctype.split(';')[0] || '未知类型'})`, finalUrl: finalUrl.href }, 415)
      }
      const html = await readTextCapped(res, MAX_BYTES)
      const title = pickMeta(html, /<title[^>]*>([\s\S]*?)<\/title>/i)
      const description =
        pickMeta(html, /<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
        pickMeta(html, /<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']*)["']/i)
      return json({
        url: finalUrl.href,
        title: pickMeta(html, /<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']*)["']/i) || title,
        description,
        ogTitle: pickMeta(html, /<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']*)["']/i),
        ogImage: pickMeta(html, /<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']*)["']/i),
        h1: pickMeta(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i),
      })
    } catch (e) {
      if (e.code === 'blocked') return json({ error: e.message }, 403)
      return json({ error: `抓取失败:${e.name === 'AbortError' ? '超时(9 秒)' : e.message}` }, 502)
    } finally {
      clearTimeout(timer)
    }
  })
}
