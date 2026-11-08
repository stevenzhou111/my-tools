/**
 * 中/英/混合文本分词:基于 Intl.Segmenter(word 粒度),零依赖,
 * 现代浏览器与 Node 16+ 内置。词频排序的平局用 UTF-16 码点比较
 * (localeCompare 在不同 ICU 环境结果不同,词云工具踩过这个坑)。
 */

const SEGMENTER = new Intl.Segmenter('zh', { granularity: 'word' })

/** 切出全部「词」token(标点/空白丢弃,保留原文形态) */
export function segmentWords(text) {
  const out = []
  for (const s of SEGMENTER.segment(String(text ?? ''))) {
    if (s.isWordLike) out.push(s.segment)
  }
  return out
}

/** 分词结果用分隔符连接(默认 " / ") */
export function segmentText(text, { sep = ' / ' } = {}) {
  return segmentWords(text).join(sep)
}

/**
 * 词频统计:按出现次数降序,次数相同按 UTF-16 码点升序(环境无关的确定性)。
 * @param {string[]|string} input token 数组或原文
 * @param {{minLen?:number}} opts 最短词长(默认 1)
 * @returns {{word:string,count:number}[]}
 */
export function wordFrequency(input, { minLen = 1 } = {}) {
  const tokens = Array.isArray(input) ? input : segmentWords(input)
  const counts = new Map()
  for (const t of tokens) {
    if (t.length < minLen) continue
    counts.set(t, (counts.get(t) || 0) + 1)
  }
  return [...counts.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || cmpCodePoint(a.word, b.word))
}

function cmpCodePoint(a, b) {
  return a < b ? -1 : a > b ? 1 : 0
}
