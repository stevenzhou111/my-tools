/**
 * /api/fetch-meta?url= — 抓取网页并提取元信息(标题/描述/og:image)。
 * 免费档 Pages Functions,纯计算无存储;带 SSRF 防护、超时与响应体上限。
 */

const MAX_BYTES = 400_000 // 只解析前 400KB,防止巨型页面拖垮 Worker

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=300' },
  })
}

/** SSRF 防护:拒绝内网/环回地址 */
export function isBlockedHost(hostname) {
  const h = String(hostname || '').toLowerCase()
  if (!h) return true
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return true
  if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(h)) return true
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true
  if (h.startsWith('[')) return true // 字面 IPv6 一律拦截(简化且安全)
  return false
}

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

export async function onRequestGet({ request }) {
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
    const res = await fetch(target.href, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; ToolboxBot/1.0; +link preview)' },
    })
    const ctype = res.headers.get('content-type') || ''
    if (!/text\/html/i.test(ctype)) {
      return json({ error: `该地址不是网页(${ctype.split(';')[0] || '未知类型'})`, finalUrl: res.url }, 415)
    }
    const html = (await res.text()).slice(0, MAX_BYTES)
    const title = pickMeta(html, /<title[^>]*>([\s\S]*?)<\/title>/i)
    const description =
      pickMeta(html, /<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
      pickMeta(html, /<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']*)["']/i)
    return json({
      url: res.url || target.href,
      title: pickMeta(html, /<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']*)["']/i) || title,
      description,
      ogTitle: pickMeta(html, /<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']*)["']/i),
      ogImage: pickMeta(html, /<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']*)["']/i),
      h1: pickMeta(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i),
    })
  } catch (e) {
    return json({ error: `抓取失败:${e.name === 'AbortError' ? '超时(9 秒)' : e.message}` }, 502)
  } finally {
    clearTimeout(timer)
  }
}
