/**
 * /api/fetch-meta?url= — 抓取网页并提取元信息(标题/描述/og:image)。
 * 免费档 Pages Functions,纯计算无存储;带 SSRF 防护、超时与响应体上限。
 */

const MAX_BYTES = 400_000 // 只解析前 400KB,防止巨型页面拖垮 Worker
const MAX_REDIRECTS = 3
const UA = 'Mozilla/5.0 (compatible; ToolboxBot/1.0; +link preview)'

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

/**
 * 只读取响应体的前 maxBytes 个字节。
 * Res.text() 会先把整个响应体(可能是几十 MB)读进内存,这里按流截断并取消后续下载。
 */
async function readTextCapped(res, maxBytes) {
  if (!res.body || typeof res.body.getReader !== 'function') {
    return (await res.text()).slice(0, maxBytes)
  }
  const reader = res.body.getReader()
  const chunks = []
  let size = 0
  try {
    while (size < maxBytes) {
      const { done, value } = await reader.read()
      if (done) break
      const remain = maxBytes - size
      if (value.byteLength > remain) {
        chunks.push(value.subarray(0, remain))
        size = maxBytes
        break
      }
      chunks.push(value)
      size += value.byteLength
    }
  } finally {
    // 达到上限时不再下载剩余内容;cancel 失败不影响已读数据
    if (size >= maxBytes) {
      try { await reader.cancel() } catch { /* ignore */ }
    }
  }
  const merged = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(merged)
}

/**
 * 手动跟随重定向:每一跳都重新做 SSRF 校验。
 * fetch 自带的 redirect: 'follow' 只校验首个 host,公网地址可经 302 跳到内网,
 * 从而绕过入口检查。
 */
async function fetchGuarded(target, signal) {
  let current = target
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetch(current.href, {
      signal,
      redirect: 'manual',
      headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml' },
    })
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location')
      if (!location) return { res, finalUrl: current }
      if (hop === MAX_REDIRECTS) {
        throw Object.assign(new Error(`重定向超过 ${MAX_REDIRECTS} 次`), { code: 'redirect' })
      }
      let next
      try {
        next = new URL(location, current.href)
      } catch {
        throw Object.assign(new Error('重定向地址不合法'), { code: 'redirect' })
      }
      if (!/^https?:$/.test(next.protocol)) {
        throw Object.assign(new Error('重定向到不支持的协议'), { code: 'redirect' })
      }
      if (isBlockedHost(next.hostname)) {
        throw Object.assign(new Error('不允许访问内网/本地地址'), { code: 'blocked' })
      }
      current = next
      continue
    }
    return { res, finalUrl: current }
  }
  throw Object.assign(new Error(`重定向超过 ${MAX_REDIRECTS} 次`), { code: 'redirect' })
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
    const { res, finalUrl } = await fetchGuarded(target, ctrl.signal)
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
}
