/**
 * TOTP(RFC 6238)/ Base32(RFC 4648)纯前端实现。
 * 密钥只在本机内存中参与计算,绝不写入任何存储。
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/** RFC 4648 Base32 解码:忽略大小写、空格与连字符;非法字符抛错 */
export function base32Decode(input) {
  const clean = String(input ?? '').toUpperCase().replace(/[\s-]/g, '').replace(/=+$/, '')
  if (!clean) throw new Error('密钥为空')
  let bits = 0
  let value = 0
  const out = []
  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch)
    if (idx === -1) throw new Error(`密钥含非法 Base32 字符:「${ch}」(只允许 A-Z 和 2-7)`)
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return new Uint8Array(out)
}

/** 随机密钥:默认 20 字节(160 位,RFC 推荐下限之上) */
export function randomSecret(bytes = 20) {
  const buf = new Uint8Array(bytes)
  crypto.getRandomValues(buf)
  let bits = 0
  let value = 0
  let out = ''
  for (const b of buf) {
    value = (value << 8) | b
    bits += 8
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  return out
}

/** Uint8Array → 十六进制(测试辅助) */
export function toHex(bytes) {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function hmac(algorithm, keyBytes, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes.slice().buffer,
    { name: 'HMAC', hash: algorithm }, // 调用方直接传 'SHA-1' 等全名
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, message.slice().buffer)
  return new Uint8Array(sig)
}

/**
 * 计算 TOTP。
 * @param {string} secret Base32 密钥
 * @param {{digits?:number, period?:number, algorithm?:'SHA-1'|'SHA-256'|'SHA-512', at?:number}} opts
 *   at 为 Unix 秒(RFC 6238 向量验证用),缺省取当前时间
 */
export async function totp(secret, { digits = 6, period = 30, algorithm = 'SHA-1', at } = {}) {
  const keyBytes = base32Decode(secret)
  const nowSec = at ?? Math.floor(Date.now() / 1000)
  const counter = Math.floor(nowSec / period)

  // 计数器按大端 8 字节编码;用模运算而不是位运算,避免 2^31 以上的 int32 溢出
  const msg = new Uint8Array(8)
  let c = counter
  for (let i = 7; i >= 0; i--) {
    msg[i] = c % 256
    c = Math.floor(c / 256)
  }

  const mac = await hmac(algorithm, keyBytes, msg)
  // 动态截断(RFC 4226 5.3):取最后一字节低 4 位为偏移
  const offset = mac[mac.length - 1] & 0x0f
  const bin =
    ((mac[offset] & 0x7f) << 24) |
    ((mac[offset + 1] & 0xff) << 16) |
    ((mac[offset + 2] & 0xff) << 8) |
    (mac[offset + 3] & 0xff)
  return (bin % 10 ** digits).toString().padStart(digits, '0')
}

/** 距下一次滚动还剩多少秒 */
export function secondsRemaining(period = 30, atMs = Date.now()) {
  return period - (Math.floor(atMs / 1000) % period)
}