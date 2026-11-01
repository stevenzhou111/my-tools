/**
 * /api/rss?url= — 抓取 RSS 2.0 / Atom 源并转为 JSON。
 * 纯正则解析(Functions 环境无 DOMParser),覆盖 title/link/日期/摘要四个核心字段;
 * 最多返回 50 条,响应体上限 800KB。
 */

const MAX_BYTES = 800_000
const MAX_ITEMS = 50

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=600' },
  })
}

export function isBlockedHost(hostname) {
  const h = String(hostname || '').toLowerCase()
  if (!h) return true
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return true
  if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(h)) return true
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true
  if (h.startsWith('[')) return true
  return false
}

function stripCdata(s) {
  return String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
}

function tag(block, name) {
  const m = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i').exec(block)
  if (!m) return ''
  return decodeEntities(stripCdata(m[1]).trim())
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
}

function stripHtml(s) {
  return decodeEntities(String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')).slice(0, 200)
}

function firstLink(block) {
  // Atom 的链接在 href 属性里,优先 rel="alternate"/无 rel 的第一个
  const hrefs = [...block.matchAll(/<link[^>]*href=["']([^"']+)["'][^>]*>/gi)].map((m) => m[1])
  if (!hrefs.length) return ''
  const alt = /<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i.exec(block)
  return alt ? alt[1] : hrefs[0]
}

/** 解析 RSS/Atom 文本 → {title, link, items} */
export function parseFeed(xml) {
  const text = String(xml || '')
  const feedTitle = tag(text, 'title')
  const feedLink = firstLink(text.split(/<item[\s>/]/i)[0] + text.split(/<entry[\s>/]/i)[0]) || firstLink(text)
  const isAtom = /<feed[\s>]/i.test(text) && !/<rss[\s>]/i.test(text)
  const blocks = isAtom ? text.match(/<entry[\s\S]*?<\/entry>/gi) : text.match(/<item[\s\S]*?<\/item>/gi)
  const items = (blocks || []).slice(0, MAX_ITEMS).map((b) => {
    const date = tag(b, 'pubDate') || tag(b, 'updated') || tag(b, 'published') || tag(b, 'dc:date')
    return {
      title: tag(b, 'title'),
      link: isAtom ? firstLink(b) : tag(b, 'link') || tag(b, 'guid'),
      date: date ? new Date(date).toString() === 'Invalid Date' ? date : new Date(date).toISOString().slice(0, 16).replace('T', ' ') : '',
      summary: stripHtml(tag(b, 'description') || tag(b, 'summary') || tag(b, 'content')),
    }
  })
  return { title: feedTitle, link: feedLink, items }
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
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; ToolboxBot/1.0; +rss reader)' },
    })
    const text = (await res.text()).slice(0, MAX_BYTES)
    if (!/<(rss|feed|channel)[\s>]/i.test(text)) {
      return json({ error: '该地址不是 RSS/Atom 源(未找到 rss/feed 标签)' }, 415)
    }
    const feed = parseFeed(text)
    if (!feed.items.length) return json({ error: '源里没有解析出任何条目' }, 422)
    return json({ ...feed, count: feed.items.length })
  } catch (e) {
    return json({ error: `抓取失败:${e.name === 'AbortError' ? '超时(9 秒)' : e.message}` }, 502)
  } finally {
    clearTimeout(timer)
  }
}
