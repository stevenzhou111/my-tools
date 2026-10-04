/**
 * 短 ID 生成:NanoID 与 ULID(UUID v4 直接用组件里现成的 crypto.randomUUID)。
 * 全部用浏览器加密级随机数,无第三方依赖。
 */

const NANO_ALPHABET = 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict'

/** NanoID:默认 21 字符,字母表 64 个 URL 安全字符 */
export function nanoId(size = 21) {
  const bytes = crypto.getRandomValues(new Uint8Array(size))
  let id = ''
  for (let i = 0; i < size; i++) id += NANO_ALPHABET[bytes[i] & 63]
  return id
}

// Crockford Base32:0-9 A-Z 去掉 I L O U
const ULIP_ALPHA = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

/**
 * ULID:26 字符大写 Crockford Base32 = 48 位毫秒时间戳(10 字符,可按字典序排序)
 * + 80 位随机数(16 字符)。传入 time 仅为测试方便,默认取当前时间。
 */
export function ulid(time = Date.now()) {
  if (!Number.isInteger(time) || time < 0) throw new Error('时间戳必须是非负整数毫秒')
  if (time > 0xffffffffffff) throw new Error('时间戳超出 ULID 上限(10889 年)')
  let ts = ''
  for (let i = 9; i >= 0; i--) {
    const mod = time % 32
    ts = ULIP_ALPHA[mod] + ts
    time = (time - mod) / 32
  }
  const bytes = crypto.getRandomValues(new Uint8Array(10))
  let n = 0n
  for (const b of bytes) n = (n << 8n) | BigInt(b)
  let rand = ''
  for (let i = 0; i < 16; i++) {
    rand = ULIP_ALPHA[Number(n & 0x1fn)] + rand
    n >>= 5n
  }
  return ts + rand
}

/** 解析 ULID 的时间戳部分,用于校验与展示 */
export function ulidTime(id) {
  if (!/^[0-9A-HJKMNP-TV-Z]{26}$/.test(id)) return null
  let t = 0
  for (let i = 0; i < 10; i++) {
    t = t * 32 + ULIP_ALPHA.indexOf(id[i])
  }
  return t
}
