/**
 * Base32 / Base58 / Base62 编解码,基于 UTF-8 字节,纯 BigInt 实现。
 * - Base32:RFC 4648(A-Z,2-7,带填充),字母表与官方向量一致
 * - Base58:Bitcoin 字母表,前导零字节编码为首字符 '1'
 * - Base62:0-9 A-Z a-z(BigInt 大端)
 */

const B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const B58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
const B62_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

const utf8Bytes = (s) => new TextEncoder().encode(s)
const utf8From = (bytes) => new TextDecoder().decode(bytes)

// ---------- Base32(5 字节块 40 位,超出 JS 32 位位运算,统一用 BigInt) ----------

export function base32Encode(text) {
  const bytes = utf8Bytes(text)
  let out = ''
  for (let i = 0; i < bytes.length; i += 5) {
    const chunk = bytes.slice(i, i + 5)
    let buf = 0n
    for (const b of chunk) buf = (buf << 8n) | BigInt(b)
    const dataChars = Math.ceil(chunk.length * 8 / 5)
    buf <<= BigInt(8 * (5 - chunk.length))
    let chars = ''
    for (let j = 0; j < 8; j++) {
      chars += j < dataChars ? B32_ALPHABET[Number((buf >> BigInt(35 - j * 5)) & 31n)] : '='
    }
    out += chars
  }
  return out
}

export function base32Decode(text) {
  const clean = String(text).replace(/[=\s]/g, '').toUpperCase()
  if (/[^A-Z2-7]/.test(clean)) throw new Error('Base32 只允许 A-Z 和 2-7')
  const bytes = []
  for (let i = 0; i < clean.length; i += 8) {
    const block = clean.slice(i, i + 8)
    let buf = 0n
    for (const ch of block) buf = (buf << 5n) | BigInt(B32_ALPHABET.indexOf(ch))
    const take = Math.floor((block.length * 5) / 8)
    buf >>= BigInt(block.length * 5 - take * 8)
    for (let j = take - 1; j >= 0; j--) bytes.push(Number((buf >> BigInt(j * 8)) & 0xffn))
  }
  return utf8From(new Uint8Array(bytes))
}

// ---------- Base58 / Base62(BigInt 大端) ----------

function bigEncode(bytes, alphabet) {
  let zeros = 0
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++
  let n = 0n
  for (const b of bytes) n = (n << 8n) | BigInt(b)
  let s = ''
  const base = BigInt(alphabet.length)
  while (n > 0n) {
    s = alphabet[Number(n % base)] + s
    n /= base
  }
  return alphabet[0].repeat(zeros) + s
}

function bigDecode(str, alphabet) {
  let zeros = 0
  while (zeros < str.length && str[zeros] === alphabet[0]) zeros++
  let n = 0n
  const base = BigInt(alphabet.length)
  for (const ch of str) {
    const idx = alphabet.indexOf(ch)
    if (idx === -1) throw new Error(`出现字母表外的字符:${JSON.stringify(ch)}`)
    n = n * base + BigInt(idx)
  }
  // 估算字节数再回填,前导零字节单独补
  const out = []
  while (n > 0n) {
    out.unshift(Number(n & 0xffn))
    n >>= 8n
  }
  return utf8From(new Uint8Array([...new Array(zeros).fill(0), ...out]))
}

export const base58Encode = (text) => bigEncode(utf8Bytes(text), B58_ALPHABET)
export const base58Decode = (text) => bigDecode(String(text).trim(), B58_ALPHABET)
export const base62Encode = (text) => bigEncode(utf8Bytes(text), B62_ALPHABET)
export const base62Decode = (text) => bigDecode(String(text).trim(), B62_ALPHABET)

export const BASE_ALGOS = {
  base32: { name: 'Base32(RFC 4648)', encode: base32Encode, decode: base32Decode },
  base58: { name: 'Base58(Bitcoin)', encode: base58Encode, decode: base58Decode },
  base62: { name: 'Base62', encode: base62Encode, decode: base62Decode },
}
