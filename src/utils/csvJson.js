/**
 * CSV ↔ JSON 互转:手写 RFC 4180 解析(引号包裹、字段内逗号/换行、双写引号转义),
 * 类型推断可关(数字/布尔;前导零的"007"保持字符串)。全部本地计算。
 */

/** 解析 CSV 文本 → string[][];delimiter 常用 ',' ';' '\t' */
export function parseCsv(text, delimiter = ',') {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  const s = String(text ?? '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
  if (!s.trim()) return rows
  let i = 0
  while (i < s.length) {
    const c = s[i]
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i += 2; continue }
        inQuotes = false
        i++
        continue
      }
      field += c
      i++
      continue
    }
    if (c === '"' && field === '') { inQuotes = true; i++; continue }
    if (c === delimiter) { row.push(field); field = ''; i++; continue }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue }
    field += c
    i++
  }
  row.push(field)
  rows.push(row)
  return rows.filter((r) => !(r.length === 1 && r[0] === ''))
}

/** 值推断:布尔/数字(前导零的数字保持字符串,如区号 "007") */
function infer(v) {
  const t = v.trim()
  if (t === 'true') return true
  if (t === 'false') return false
  if (/^-?\d+(\.\d+)?$/.test(t) && !/^-?0\d/.test(t)) return Number(t)
  return v
}

/**
 * CSV → JSON。
 * @returns {object[]|any[][]} headerRow=true 时输出对象数组(表头为键,重名键自动加后缀),否则二维数组
 */
export function csvToJson(text, { headerRow = true, infer: doInfer = true, delimiter = ',' } = {}) {
  const rows = parseCsv(text, delimiter)
  if (!rows.length) return []
  const cast = (v) => (doInfer ? infer(v) : v)
  if (!headerRow) return rows.map((r) => r.map(cast))
  const seen = {}
  const headers = rows[0].map((h) => {
    const base = h.trim() || '(空列名)'
    seen[base] = (seen[base] || 0) + 1
    return seen[base] > 1 ? `${base}_${seen[base]}` : base
  })
  return rows.slice(1).map((r) => {
    const o = {}
    headers.forEach((h, i) => { o[h] = cast(r[i] ?? '') })
    return o
  })
}

/** 引用含分隔符/引号/换行的字段 */
function csvField(v, delimiter) {
  const s = String(v ?? '')
  if (s.includes('"') || s.includes(delimiter) || /[\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

/**
 * JSON → CSV。rows 为对象数组(键取并集,按首次出现顺序)或二维数组。
 * @returns {string}
 */
export function jsonToCsv(rows, { delimiter = ',', header = true } = {}) {
  const arr = Array.isArray(rows) ? rows : []
  if (!arr.length) return ''
  const isObjects = arr.every((r) => r && typeof r === 'object' && !Array.isArray(r))
  let cols
  let lines = []
  if (isObjects) {
    cols = []
    for (const r of arr) for (const k of Object.keys(r)) if (!cols.includes(k)) cols.push(k)
    if (header) lines.push(cols.map((c) => csvField(c, delimiter)).join(delimiter))
    for (const r of arr) lines.push(cols.map((c) => csvField(r[c], delimiter)).join(delimiter))
  } else {
    if (header && arr[0]) lines.push(arr[0].map((c) => csvField(c, delimiter)).join(delimiter))
    for (const r of arr.slice(1)) lines.push((r || []).map((c) => csvField(c, delimiter)).join(delimiter))
  }
  return lines.join('\n') + '\n'
}
