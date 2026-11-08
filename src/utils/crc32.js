/**
 * CRC-32(IEEE 802.3,zip / PNG / 以太网同款)纯表驱动实现。
 * 已知向量:'123456789' → 0xCBF43926。
 */

const TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})();

/** 任意字节序列或 UTF-8 文本 → 无符号 32 位 CRC-32 */
export function crc32(data) {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i++) crc = TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

/** 大写 8 位十六进制(常见展示口径) */
export function crc32Hex(data) {
  return crc32(data).toString(16).toUpperCase().padStart(8, '0')
}
