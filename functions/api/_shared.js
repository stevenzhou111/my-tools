/**
 * Pages Functions 公共层:JSON 响应与受控抓取(SSRF 防护核心)。
 *
 * 文件名以 _ 开头,Pages 不会把它注册成路由。安全关键代码只此一份,
 * 新增 /api 端点务必 import 复用,不要再复制。
 */

export const MAX_REDIRECTS = 3

/** 统一 JSON 响应;maxAge 控制浏览器端缓存时长(错误响应请传 0) */
export function json(data, status = 200, maxAge = 300) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': `public, max-age=${maxAge}` },
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
export async function readTextCapped(res, maxBytes) {
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
 * 从而绕过入口检查。headers(UA/accept)由各端点按用途传入。
 */
export async function fetchGuarded(target, signal, headers = {}) {
  let current = target
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetch(current.href, {
      signal,
      redirect: 'manual',
      headers,
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
