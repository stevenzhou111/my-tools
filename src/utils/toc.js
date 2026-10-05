/**
 * Markdown 目录(TOC)生成:提取标题层级并生成 GitHub 风格锚点链接。
 * 跳过 ``` 围栏代码块里的 # 行;锚点规则与 GitHub 一致:
 * 小写化、保留字母/数字/汉字/空格/连字符/下划线,其余剔除,空格转 -。
 */

export function githubSlug(text) {
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-')
}

/**
 * 提取标题。返回 [{ level, text, slug }]
 * @param {string} markdown
 */
export function extractHeadings(markdown) {
  const out = []
  let inFence = false
  for (const line of String(markdown).split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    const m = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line)
    if (m) out.push({ level: m[1].length, text: m[2].trim(), slug: githubSlug(m[2]) })
  }
  return out
}

/**
 * 生成目录文本。
 * @param {object} opts
 * @param {number} opts.minLevel 最小层级(1-6)
 * @param {number} opts.maxLevel 最大层级(1-6)
 * @param {boolean} opts.ordered 有序列表
 * @param {string} opts.code 语言标记无实际作用,预留
 */
export function buildToc(markdown, { minLevel = 2, maxLevel = 4, ordered = false } = {}) {
  const lo = Math.max(1, Math.min(6, Math.floor(minLevel)))
  const hi = Math.max(lo, Math.min(6, Math.floor(maxLevel)))
  const heads = extractHeadings(markdown).filter((h) => h.level >= lo && h.level <= hi)
  if (!heads.length) return ''
  const lines = []
  let seq = 0
  // 相对最浅层级缩进,保证顶层不缩进
  const min = Math.min(...heads.map((h) => h.level))
  for (const h of heads) {
    const depth = h.level - min
    const indent = '  '.repeat(depth) + (ordered ? `${++seq}. ` : '- ')
    lines.push(`${indent}[${h.text}](#${h.slug})`)
  }
  return lines.join('\n')
}
