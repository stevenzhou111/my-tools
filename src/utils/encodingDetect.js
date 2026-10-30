/**
 * 文本编码检测:同一份字节流用多种常见编码试解,按可读性打分排序。
 * 浏览器只能「解码」任意编码(TextDecoder),无法把字符串「编码」回 GBK 等,
 * 因此修复粘贴文本仅支持 Latin-1 反转路径;文件字节流则可全矩阵检测。
 */

export const CANDIDATES = [
  { enc: 'utf-8', label: 'UTF-8' },
  { enc: 'gbk', label: 'GBK / 简体中文' },
  { enc: 'big5', label: 'Big5 / 繁体中文' },
  { enc: 'shift-jis', label: 'Shift-JIS / 日语' },
  { enc: 'utf-16le', label: 'UTF-16 LE' },
  { enc: 'windows-1252', label: 'Windows-1252 / 西文' },
]

function score(text) {
  let s = 0
  let cjk = 0
  for (const ch of text) {
    const cp = ch.codePointAt(0)
    if (cp === 0xfffd) s -= 100 // 替换符:解码失败的最强信号
    else if (cp < 0x20 && cp !== 0x09 && cp !== 0x0a && cp !== 0x0d) s -= 5 // 异常控制符
    else if ((cp >= 0x4e00 && cp <= 0x9fff) || (cp >= 0x3000 && cp <= 0x303f)) cjk++
    else if (cp >= 0x20 && cp < 0x7f) s += 0.1
  }
  s += cjk * (cjk > 5 ? 1.2 : 0.5) // 中文占比高且成规模才算真命中,避免 GBK 误报
  return s
}

/** 用指定编码解码字节;fatal 模式失败返回 null */
export function decodeWith(bytes, enc) {
  try {
    return new TextDecoder(enc, { fatal: true }).decode(bytes)
  } catch {
    return null
  }
}

/**
 * 全矩阵检测。
 * @returns {{ best:string, results:{enc,label,ok,score,text}[] }}
 */
export function detectEncoding(bytes) {
  const results = CANDIDATES.map(({ enc, label }) => {
    const text = decodeWith(bytes, enc)
    let sc = text === null ? -Infinity : score(text)
    // 合法 UTF-8 几乎总是真身:GBK/Big5 重解读 UTF-8 字节会产出大量"像中文"的假象,
    // 但反向不成立(UTF-8 严格校验,错一个字节就 fatal),因此给决定性加分
    if (enc === 'utf-8' && text !== null) sc += 50
    return { enc, label, ok: text !== null, score: sc, text }
  })
  // 同分时保持 utf-8 优先的候选顺序
  results.sort((a, b) => b.score - a.score)
  return { best: results[0]?.ok ? results[0].enc : 'utf-8', results }
}

/**
 * 修复「UTF-8 字节被按 Latin-1 显示」的经典乱码(如 ä½ å¥½ → 你好)。
 * 原理:逐字符取 charCode 还原原始字节,再用 UTF-8 解码;含替换符或解码失败即放弃。
 */
export function repairLatin1(text) {
  if (!/[\u0080-\u00ff]/.test(text)) return null
  const bytes = new Uint8Array([...text].map((c) => c.charCodeAt(0)))
  for (const b of bytes) if (b === 0xfffd || b > 0xff) return null
  try {
    const out = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    return out.includes('\ufffd') ? null : out
  } catch {
    return null
  }
}
