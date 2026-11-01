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
 * 反向:Markdown 表格 → 行数组。
 * 跳过 |---| 对齐行,按未转义的 | 切分(还原 \| 与 <br>);保留原始单元格文本。
 * @returns {{rows:string[][], error:string}}
 */
/** 按未转义的 | 切一行,\| 视作字面竖线 */
function splitMdRow(line) {
  const cells = []
  let cur = ''
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '\\' && line[i + 1] === '|') {
      cur += '|'
      i++
      continue
    }
    if (c === '|') {
      cells.push(cur.trim())
      cur = ''
      continue
    }
    cur += c
  }
  cells.push(cur.trim())
  return cells
}

export function fromMarkdownTable(text) {
  const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n').map((l) => l.trim()).filter((l) => l !== '')
  const tableLines = lines.filter((l) => l.includes('|'))
  if (!tableLines.length) return { rows: [], error: '没有找到含 | 的表格行' }
  const rows = []
  for (const line of tableLines) {
    const cells = splitMdRow(line.replace(/^\|/, '').replace(/\|$/, ''))
    // 跳过 |---|---| 形态的对齐行
    if (cells.every((c) => /^:?-{2,}:?$/.test(c) || c === '')) continue
    rows.push(cells.map((c) => c.replace(/<br\s*\/?>/gi, '\n')))
  }
  if (rows.length < 1) return { rows: [], error: '没有解析到数据行' }
  return { rows, error: '' }
}

/** 行数组 → TSV(粘贴进 Excel 即成表格);单元格内的 Tab/换行替换为空格 */
export function rowsToTsv(rows) {
  return rows.map((r) => r.map((c) => c.replace(/[\t\n\r]+/g, ' ')).join('\t')).join('\n')
}

/** 行数组 → CSV:含逗号/引号/换行的单元格用引号包裹,内部引号翻倍 */
export function rowsToCsv(rows) {
  const q = (c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)
  return rows.map((r) => r.map(q).join(',')).join('\n')
}

/** 行数组 → JSON 对象数组(首行作键);不足的列补空串 */
export function rowsToJson(rows) {
  if (rows.length < 2) return '[]'
  const width = Math.max(...rows.map((r) => r.length))
  const header = rows[0].map((h, i) => h || `列${i + 1}`)
  const out = rows.slice(1).map((r) => {
    const cells = [...r]
    while (cells.length < width) cells.push('')
    return Object.fromEntries(header.map((h, i) => [h, cells[i]]))
  })
  return JSON.stringify(out, null, 2)
}

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
