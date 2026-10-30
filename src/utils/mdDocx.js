/**
 * Markdown 子集 → buildDocx 段落列表。
 * 支持:1-6 级标题、粗体/斜体/行内代码/链接的行内混排、无序与有序列表、
 * 引用、``` 代码块、分隔线。表格等复杂结构不在此列(有专门的表格工具)。
 */

const HEADING_HALF_PT = [44, 36, 30, 26, 24, 22]

// 行内切分:粗体 / 斜体 / 行内代码 / 链接
const INLINE_RE = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*\s][^*]*\*|`[^`]+`|\[[^\]]+\]\([^)\s]*\))/g

/** 行内文本 → runs 数组 */
export function parseInline(text) {
  const runs = []
  for (const seg of String(text).split(INLINE_RE)) {
    if (!seg) continue
    if ((seg.startsWith('**') && seg.endsWith('**')) || (seg.startsWith('__') && seg.endsWith('__'))) {
      runs.push({ text: seg.slice(2, -2), bold: true })
    } else if (seg.startsWith('`') && seg.endsWith('`')) {
      runs.push({ text: seg.slice(1, -1), code: true })
    } else if (seg.startsWith('*') && seg.endsWith('*') && seg.length > 2) {
      runs.push({ text: seg.slice(1, -1), italic: true })
    } else if (seg.startsWith('[')) {
      const m = /^\[([^\]]+)\]\(([^)\s]*)\)$/.exec(seg)
      // docx 不带关系表时无法做真超链接,渲染为「文本 (URL)」保住信息
      runs.push(m ? { text: `${m[1]} (${m[2]})` } : { text: seg })
    } else {
      runs.push({ text: seg })
    }
  }
  return runs
}

/**
 * @param {string} markdown
 * @returns {Array<object>} buildDocx 可直接消费的段落数组
 */
export function mdToParagraphs(markdown) {
  const lines = String(markdown ?? '').split(/\r?\n/)
  const out = []
  let inFence = false
  let fenceLang = ''

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '')
    if (/^\s*(```|~~~)/.test(line)) {
      if (!inFence) {
        inFence = true
        fenceLang = line.replace(/^\s*(```|~~~)\s*/, '').trim()
        if (fenceLang) out.push({ runs: [{ text: `[代码:${fenceLang}]`, italic: true, sizeHalfPt: 18 }], afterTwips: 40 })
      } else {
        inFence = false
      }
      continue
    }
    if (inFence) {
      out.push({ runs: [{ text: raw || ' ', code: true, sizeHalfPt: 18 }], afterTwips: 0 })
      continue
    }
    if (!line.trim()) continue

    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (heading) {
      const level = heading[1].length
      out.push({ runs: parseInline(heading[2]).map((r) => ({ ...r, bold: true })), heading: true, sizeHalfPt: HEADING_HALF_PT[level - 1] })
      continue
    }
    if (/^\s*(---+|\*\*\*+|___+)\s*$/.test(line)) {
      out.push({ runs: [{ text: '────────────────' }], afterTwips: 200 })
      continue
    }
    const ol = /^\s*\d+[.)]\s+(.*)$/.exec(line)
    if (ol) {
      const n = out.filter((p) => p.__list === 'ol').length + 1
      out.push({ __list: 'ol', indent: true, runs: [{ text: `${n}. ` }, ...parseInline(ol[1])] })
      continue
    }
    const ul = /^\s*[-*+]\s+(.*)$/.exec(line)
    if (ul) {
      out.push({ indent: true, runs: [{ text: '• ' }, ...parseInline(ul[1])] })
      continue
    }
    const quote = /^\s*>\s?(.*)$/.exec(line)
    if (quote) {
      out.push({ indent: true, runs: parseInline(quote[1]).map((r) => ({ ...r, italic: true })) })
      continue
    }
    out.push({ runs: parseInline(line) })
  }
  return out
}
