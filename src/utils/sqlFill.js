/**
 * SQL 参数填充:把占位符(? 或 $1/$2…)替换为真实字面量,用于把
 * 慢查询日志 / ORM 输出的参数化 SQL 还原成可直接执行的语句。
 * 字符串值做单引号转义(' → ''),可选 MySQL 反斜杠转义;数字、布尔、
 * null、日期对象分别按 SQL 字面量输出。
 */

function literal(v, { mysqlBackslash = false } = {}) {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL'
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
  if (v instanceof Date) return `'${v.toISOString().replace('T', ' ').slice(0, 23)}'`
  const s = String(v)
  const escaped = mysqlBackslash ? s.replace(/\\/g, '\\\\').replace(/'/g, "\\'") : s.replace(/'/g, "''")
  return `'${escaped}'`
}

/**
 * 填充参数。
 * @param {string} sql 含 ? 或 $n 占位符的 SQL
 * @param {Array} params 参数数组
 * @param {object} opts { mysqlBackslash }
 * @returns {{ ok:boolean, text?:string, error?:string, used?:number }}
 */
export function fillSqlParams(sql, params, { mysqlBackslash = false } = {}) {
  const list = Array.isArray(params) ? params : [params]
  let used = 0
  let i = 0
  let out = ''
  const s = String(sql ?? '')

  // 逐字符扫描,跳过字符串与行注释,避免把字面量里的 ? 当参数
  while (i < s.length) {
    const ch = s[i]
    if (ch === "'") {
      const end = findStringEnd(s, i)
      out += s.slice(i, end + 1)
      i = end + 1
      continue
    }
    if (ch === '-' && s[i + 1] === '-') {
      const nl = s.indexOf('\n', i)
      const stop = nl === -1 ? s.length : nl
      out += s.slice(i, stop)
      i = stop
      continue
    }
    if (ch === '?') {
      if (used >= list.length) return { ok: false, error: `SQL 里的 ? 比参数多:第 ${used + 1} 个 ? 没有对应参数` }
      out += literal(list[used++], { mysqlBackslash })
      i++
      continue
    }
    if (ch === '$') {
      const m = /^\$(\d+)/.exec(s.slice(i))
      if (m) {
        const idx = Number(m[1]) - 1
        if (idx < 0 || idx >= list.length) return { ok: false, error: `$${m[1]} 超出参数范围(共 ${list.length} 个)` }
        out += literal(list[idx], { mysqlBackslash })
        used++
        i += m[0].length
        continue
      }
    }
    out += ch
    i++
  }
  if (used < list.length) return { ok: false, error: `参数比 ? 多:还有 ${list.length - used} 个参数没有被使用` }
  return { ok: true, text: out, used }
}

/** 找到单引号字符串的结束位置('' 为转义) */
function findStringEnd(s, start) {
  let i = start + 1
  while (i < s.length) {
    if (s[i] === "'") {
      if (s[i + 1] === "'") {
        i += 2
        continue
      }
      return i
    }
    i++
  }
  return s.length - 1
}
