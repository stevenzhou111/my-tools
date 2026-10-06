/**
 * JWT HS256/384/512 签名与校验(浏览器 WebCrypto)。
 * 只支持 HMAC 系列对称算法;RS/ES 需要非对称密钥管理,超出本工具范围。
 */

const ALGOS = {
  HS256: { name: 'HMAC', hash: 'SHA-256' },
  HS384: { name: 'HMAC', hash: 'SHA-384' },
  HS512: { name: 'HMAC', hash: 'SHA-512' },
}

export function b64urlEncode(bytes) {
  let bin = ''
  for (const b of new Uint8Array(bytes)) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function b64urlDecode(s) {
  let base64 = String(s).replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4) base64 += '='
  const bin = atob(base64)
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

async function hmacKey(secret, algo) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: ALGOS[algo].name, hash: ALGOS[algo].hash },
    false,
    ['sign'],
  )
}

/** 对 header+payload 做签名,返回 base64url 签名段 */
export async function signPart(headerB64, payloadB64, secret, algo = 'HS256') {
  if (!ALGOS[algo]) throw new Error(`不支持的算法:${algo}(仅支持 HS256 / HS384 / HS512)`)
  const key = await hmacKey(secret, algo)
  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`)
  const sig = await crypto.subtle.sign(ALGOS[algo].name, key, data)
  return b64urlEncode(sig)
}

/**
 * 生成完整 JWT。header 自动补 alg 与 typ(已有则保留其余字段)。
 * @returns {Promise<{token:string, header:object, payload:object}>}
 */
export async function createJwt(payload, secret, algo = 'HS256', extraHeader = {}) {
  const header = { alg: algo, typ: 'JWT', ...extraHeader }
  const headerB64 = b64urlEncode(new TextEncoder().encode(JSON.stringify(header)))
  const payloadB64 = b64urlEncode(new TextEncoder().encode(JSON.stringify(payload)))
  const signature = await signPart(headerB64, payloadB64, secret, algo)
  return { token: `${headerB64}.${payloadB64}.${signature}`, header, payload }
}

/**
 * 校验已有 token 的签名(与 secret 重算比对,不依赖 exp 等声明)。
 * @returns {Promise<{ok:boolean, error?:string, expected?:string}>}
 */
export async function verifyJwt(token, secret) {
  const segs = String(token).trim().split('.')
  if (segs.length < 3) return { ok: false, error: 'JWT 需要三段(header.payload.signature)' }
  let header
  try {
    header = JSON.parse(new TextDecoder().decode(b64urlDecode(segs[0])))
  } catch {
    return { ok: false, error: 'header 不是合法的 JSON' }
  }
  const algo = header?.alg
  if (!ALGOS[algo]) return { ok: false, error: `不支持的算法:${algo ?? '(缺失)'}` }
  try {
    const expected = await signPart(segs[0], segs[1], secret, algo)
    return { ok: expected === segs[2], expected }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}
