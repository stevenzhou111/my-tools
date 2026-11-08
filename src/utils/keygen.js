/**
 * 非对称密钥生成:浏览器 WebCrypto 生成 RSA / EC 密钥对,
 * 导出为标准 PEM(SPKI 公钥 / PKCS#8 私钥),可直接放进 ssh/openssl/JWT 场景。
 */

export const KEY_KINDS = [
  { id: 'RSA-2048', label: 'RSA 2048' },
  { id: 'RSA-4096', label: 'RSA 4096(较慢)' },
  { id: 'EC-P256', label: 'EC P-256' },
  { id: 'EC-P384', label: 'EC P-384' },
]

function algorithm(kind) {
  if (kind.startsWith('RSA')) {
    return { name: 'RSASSA-PKCS1-v1_5', modulusLength: Number(kind.split('-')[1]), publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }
  }
  // 'EC-P256' → 曲线名 'P-256'(WebCrypto 标准写法)
  return { name: 'ECDSA', namedCurve: kind.replace('EC-', '').replace(/^P(\d+)$/, 'P-$1') }
}

/** DER 字节 → PEM 文本(64 字符换行) */
export function toPem(derB64, label) {
  const body = (derB64.match(/.{1,64}/g) || []).join('\n')
  return `-----BEGIN ${label}-----\n${body}\n-----END ${label}-----`
}

/**
 * 生成密钥对。
 * @returns {Promise<{publicPem:string, privatePem:string}>}
 */
export async function generateKeyPair(kind) {
  if (!KEY_KINDS.some((k) => k.id === kind)) throw new Error(`不支持的密钥类型:${kind}`)
  const pair = await crypto.subtle.generateKey(algorithm(kind), true, ['sign', 'verify'])
  const spki = await crypto.subtle.exportKey('spki', pair.publicKey)
  const pkcs8 = await crypto.subtle.exportKey('pkcs8', pair.privateKey)
  const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)))
  return {
    publicPem: toPem(b64(spki), 'PUBLIC KEY'),
    privatePem: toPem(b64(pkcs8), 'PRIVATE KEY'),
  }
}
