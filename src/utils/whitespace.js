/**
 * 换行符与不可见字符:检测/统一 CRLF 与 LF、统计与清除零宽字符、
 * 把不可见字符渲染成可见占位符。纯函数。
 */

/** 统计两种换行符出现次数与主导者 */
export function detectLineEndings(text) {
  const s = String(text ?? '')
  const crlf = (s.match(/\r\n/g) || []).length
  const lf = (s.replace(/\r\n/g, '').match(/\r|\n/g) || []).length
  if (crlf === 0 && lf === 0) return { crlf: 0, lf: 0, dominant: null }
  return { crlf, lf, dominant: crlf >= lf ? 'crlf' : 'lf' }
}

export function convertLineEndings(text, to) {
  const s = String(text ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  return to === 'crlf' ? s.replace(/\n/g, '\r\n') : s
}

const ZERO_WIDTH = [
  { code: 0x200b, name: '零宽空格 ZWSP' },
  { code: 0x200c, name: '零宽非连接符 ZWNJ' },
  { code: 0x200d, name: '零宽连接符 ZWJ' },
  { code: 0xfeff, name: 'BOM / 零宽不换行空格' },
  { code: 0x2060, name: '词连接符 WJ' },
]

/** 逐类统计零宽字符数量 */
export function countZeroWidth(text) {
  const s = String(text ?? '')
  return ZERO_WIDTH.map((z) => ({
    ...z,
    count: (s.match(new RegExp(String.fromCharCode(z.code), 'g')) || []).length,
  })).filter((z) => z.count > 0)
}

/** 删除全部零宽字符 */
export function stripZeroWidth(text) {
  const re = new RegExp(ZERO_WIDTH.map((z) => String.fromCharCode(z.code)).join('|'), 'g')
  return String(text ?? '').replace(re, '')
}

/**
 * 把不可见字符替换成可见占位符,用于排查「看起来一样的字符串为什么不相等」。
 * 空格→·、全角空格→␠、Tab→⇥、CR→␍、LF→␊、NBSP→⍽、零宽字符→⟦zw⟧
 */
export function revealInvisible(text) {
  return String(text ?? '')
    .replace(/\u200b|\u200c|\u200d|\ufeff|\u2060/g, '⟦zw⟧')
    .replace(/\u00a0/g, '⍽')
    .replace(/\u3000/g, '␠')
    .replace(/\t/g, '⇥')
    .replace(/\r\n|\r|\n/g, '␊\n')
    .replace(/ /g, '·')
}
