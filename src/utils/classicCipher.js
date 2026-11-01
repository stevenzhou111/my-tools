/**
 * 经典密码:凯撒(Caesar)、维吉尼亚(Vigenère)、Atbash。
 * 英文字母参与运算且保留原大小写,其余字符(汉字、数字、标点)原样保留;
 * 解密即反向运算。
 */

const A_UP = 65
const Z_UP = 90
const A_LOW = 97
const Z_LOW = 122

function shiftChar(ch, k) {
  const code = ch.charCodeAt(0)
  if (code >= A_UP && code <= Z_UP) return String.fromCharCode(A_UP + (((code - A_UP + k) % 26 + 26) % 26))
  if (code >= A_LOW && code <= Z_LOW) return String.fromCharCode(A_LOW + (((code - A_LOW + k) % 26 + 26) % 26))
  return ch
}

/** 凯撒:字母整体位移 k 位;解密传 -k */
export function caesar(text, k) {
  const kk = ((Number(k) | 0) % 26 + 26) % 26
  return String(text || '').replace(/[a-zA-Z]/g, (ch) => shiftChar(ch, kk))
}

/** Atbash:字母表镜像(A↔Z),自反 */
export function atbash(text) {
  return String(text || '').replace(/[a-zA-Z]/g, (ch) => {
    const code = ch.charCodeAt(0)
    return code <= Z_UP ? String.fromCharCode(A_UP + Z_UP - code) : String.fromCharCode(A_LOW + Z_LOW - code)
  })
}

/** 维吉尼亚:密钥逐字母位移;dir=-1 为解密 */
export function vigenere(text, key, dir = 1) {
  const k = String(key || '').toUpperCase().replace(/[^A-Z]/g, '')
  if (!k) throw new Error('密钥需要至少包含一个英文字母')
  let ki = 0
  return String(text || '').replace(/[a-zA-Z]/g, (ch) => {
    const shift = (k.charCodeAt(ki % k.length) - A_UP) * dir
    ki++
    return shiftChar(ch, shift)
  })
}

/** 破解辅助:凯撒 26 种位移全部列出,命中可读文本的那一行即是明文 */
export function caesarAllShifts(text) {
  return Array.from({ length: 26 }, (_, i) => ({ shift: i, text: caesar(text, i) }))
}

/** 字母频率统计(破解辅助,忽略大小写) */
export function letterFreq(text) {
  const freq = new Map()
  for (const ch of String(text || '').toUpperCase()) {
    if (ch.charCodeAt(0) >= A_UP && ch.charCodeAt(0) <= Z_UP) {
      freq.set(ch, (freq.get(ch) || 0) + 1)
    }
  }
  return [...freq.entries()].map(([ch, n]) => ({ ch, n })).sort((a, b) => b.n - a.n)
}
