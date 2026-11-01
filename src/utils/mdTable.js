/**
 * Markdown 表格生成:解析粘贴进来的表格文本(TSV / CSV / 竖线分隔),
 * 输出 GitHub 风格的 Markdown 表格。
 *
 * CSV 按最小状态机处理引号(单元格内的逗号、换行、转义的 "" 都不会切错);
 * TSV 优先:只要行内有 Tab 就按 Tab 切,Excel 直接复制粘贴即用。
 */

/** 按单字符分隔符切一行,支持双引号包裹(成对的 "" 表示字面引号) */
function splitQuoted(line, delim) {
  const cells = []
  let cur = ''
  let inQuote = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inQuote) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else inQuote = false
      } else cur += c
    } else if (c === '"' && cur === '') {
      inQuote = true
    } else if (c === delim) {
      cells.push(cur)
      cur = ''
    } else cur += c
  }
  cells.push(cur)
  return cells
}

/**
 * 全文本状态机切分(TSV/CSV):支持引号包裹的单元格内含分隔符、
 * 双引号与真实换行;每行一个数组返回。
 */
function splitRecords(text, delim) {
  const rows = [[]]
  let cur = ''
  let inQuote = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuote) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cur += '"'
          i++
        } else inQuote = false
      } else cur += c
    } else if (c === '"' && cur === '') {
      inQuote = true
    } else if (c === delim) {
      rows[rows.length - 1].push(cur.trim())
      cur = ''
    } else if (c === '\n') {
      rows[rows.length - 1].push(cur.trim())
      cur = ''
      rows.push([])
    } else if (c === '\r') {
      // \r\n 与 lone \r 都当行结束
    } else cur += c
  }
  const tail = rows[rows.length - 1]
  tail.push(cur.trim())
  return rows.filter((r) => r.length > 1 || r[0] !== '')
}

/**
 * 把表格文本解析为二维数组(不含包围空行)。
 * @returns {{rows:string[][], delim:string, error:string}}
 */
export function parseTable(text) {
  const trimmed = text.replace(/\r\n?/g, '\n').trim()
  if (!trimmed) return { rows: [], delim: '\t', error: '' }

  const hasTab = trimmed.includes('\t')
  const hasPipe = !hasTab && trimmed.split('\n').every((l) => l.includes('|'))
  const hasComma = !hasTab && !hasPipe && trimmed.includes(',')
  // 优先级:Tab(Excel 直接粘贴)> 竖线(已是 Markdown)> 逗号
  const delim = hasTab ? '\t' : hasPipe ? '|' : hasComma ? ',' : ''
  if (!delim) {
    return { rows: trimmed.split('\n').map((l) => [l.trim()]), delim, error: '未识别到分隔符,请粘贴 Excel/TSV/CSV 内容' }
  }

  if (delim === '|') {
    const rows = []
    for (const line of trimmed.split('\n')) {
      // Markdown 行:去掉首尾竖线后按竖线切
      const cells = line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim())
      // 跳过 |---|---| 形态的分隔行
      if (cells.every((c) => /^:?-{2,}:?$/.test(c) || c === '')) continue
      rows.push(cells)
    }
    return { rows, delim, error: '' }
  }

  return { rows: splitRecords(trimmed, delim), delim, error: '' }
}

export const ALIGN_OPTIONS = [
  { id: 'none', label: '默认', token: '---' },
  { id: 'left', label: '左对齐', token: ':---' },
  { id: 'center', label: '居中', token: ':---:' },
  { id: 'right', label: '右对齐', token: '---:' },
]

/**
 * 渲染 Markdown 表格。
 * @param {string[][]} rows 首行为表头
 * @param {string[]} aligns 每列对齐方式(ALIGN_OPTIONS 的 id)
 */
export function toMarkdown(rows, aligns = []) {
  if (!rows.length) return ''
  const width = Math.max(...rows.map((r) => r.length))
  const pad = (r) => {
    const cells = [...r]
    while (cells.length < width) cells.push('')
    return cells
  }
  const esc = (c) => c.replace(/\|/g, '\\|').replace(/\n/g, '<br>')
  const head = pad(rows[0]).map(esc)
  const body = rows.slice(1).map(pad)

  const lines = [
    `| ${head.join(' | ')} |`,
    `| ${Array.from({ length: width }, (_, i) => ALIGN_OPTIONS.find((a) => a.id === aligns[i])?.token || '---').join(' | ')} |`,
    ...body.map((r) => `| ${r.map(esc).join(' | ')} |`),
  ]
  return lines.join('\n')
}
