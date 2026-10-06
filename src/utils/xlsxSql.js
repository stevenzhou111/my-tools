/**
 * 把表格数据(表头 + 行)生成 INSERT 语句,用于给测试库灌数据。
 * 组件层负责用 SheetJS 解析文件,这里只做纯 SQL 文本生成。
 */

const IDENT_RE = /^[A-Za-z_][A-Za-z0-9_$]*$/

function quoteIdent(name, dialect) {
  return dialect === 'postgres' ? `"${name}"` : `\`${name}\``
}

/** 单个值 → SQL 字面量 */
export function sqlLiteral(v, { dialect = 'mysql', emptyAsNull = true } = {}) {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL'
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
  if (v instanceof Date) return `'${v.toISOString().replace('T', ' ').slice(0, 19)}'`
  const s = String(v)
  if (emptyAsNull && s.trim() === '') return 'NULL'
  return `'${s.replace(/'/g, "''")}'`
}

/**
 * 生成 INSERT 语句。
 * @param {object} data { headers: string[], rows: any[][] }
 * @param {object} opts
 * @param {'mysql'|'postgres'} opts.dialect
 * @param {string} opts.table 表名
 * @param {'batch'|'rows'} opts.mode batch=多行合并,rows=每行一条
 * @param {boolean} opts.emptyAsNull 空字符串按 NULL 输出
 * @param {number} opts.batchSize batch 模式每条语句包含的行数
 * @returns {{ ok:boolean, text?:string, count?:number, error?:string }}
 */
export function buildInserts(data, { dialect = 'mysql', table = 'my_table', mode = 'batch', emptyAsNull = true, batchSize = 200 } = {}) {
  const name = String(table ?? '').trim()
  if (!name) return { ok: false, error: '请填写表名' }
  if (!data || !Array.isArray(data.rows) || data.rows.length === 0) {
    return { ok: false, error: '没有数据行:请确认表格里至少有一行数据' }
  }
  const headers = data.headers ?? []
  if (!headers.length) return { ok: false, error: '没有表头列' }

  const cols = headers.map((h) => quoteIdent(String(h), dialect)).join(', ')
  const full = `${quoteIdent(name, dialect)}`
  const statements = []
  let count = 0

  const rowTuple = (row) => {
    const vals = headers.map((_, ci) => sqlLiteral(row[ci], { dialect, emptyAsNull }))
    return `(${vals.join(', ')})`
  }

  if (mode === 'rows') {
    for (const row of data.rows) {
      statements.push(`INSERT INTO ${full} (${cols}) VALUES ${rowTuple(row)};`)
      count++
    }
  } else {
    for (let i = 0; i < data.rows.length; i += batchSize) {
      const chunk = data.rows.slice(i, i + batchSize)
      statements.push(`INSERT INTO ${full} (${cols}) VALUES\n  ${chunk.map(rowTuple).join(',\n  ')};`)
      count += chunk.length
    }
  }
  return { ok: true, text: statements.join('\n\n'), count }
}
