/**
 * 工时累加:逐行解析「开始-结束」区间(支持跨午夜)与纯时长(8.5h / 90m / 2:15),
 * 汇总为总时长。逐行给出解析结果,错行标注原因而不是整体失败。
 */

/** "HH:MM" → 当日分钟数;非法返回 null */
function parseHM(s) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim())
  if (!m) return null
  const min = +m[1] * 60 + +m[2]
  return m[1] === '24' && m[2] === '0' ? 1440 : min > 1440 ? null : min
}

/** 单行时长(分钟);返回 { minutes } 或 { error } */
export function parseLine(line) {
  const t = line.trim()
  if (!t) return { minutes: 0, empty: true }
  // 区间:start-end(支持跨午夜,如 22:00-06:00 = 8 小时)
  const range = /^(\d{1,2}:\d{2})\s*[-~至]\s*(\d{1,2}:\d{2})$/.exec(t)
  if (range) {
    const a = parseHM(range[1])
    const b = parseHM(range[2])
    if (a === null || b === null) return { error: `时间不合法:${t}` }
    return { minutes: (b - a + 1440) % 1440 }
  }
  // 纯时长:8.5h / 90m / 2:15 / 7.5小时
  const h = /^([\d.]+)\s*(?:h|小时|时)$/i.exec(t)
  if (h) {
    const v = Number(h[1])
    return Number.isFinite(v) && v >= 0 ? { minutes: Math.round(v * 60) } : { error: `时长不合法:${t}` }
  }
  const m = /^([\d.]+)\s*(?:m|min|分(?:钟)?)$/i.exec(t)
  if (m) {
    const v = Number(m[1])
    return Number.isFinite(v) && v >= 0 ? { minutes: Math.round(v) } : { error: `时长不合法:${t}` }
  }
  const hm = /^(\d{1,3}):(\d{2})$/.exec(t)
  if (hm) return { minutes: +hm[1] * 60 + +hm[2] }
  return { error: `看不懂这一行:${t}(支持 09:00-18:00、8.5h、90m、2:15)` }
}

/** 多行汇总 */
export function sumTimesheet(text) {
  const rows = String(text ?? '')
    .split(/\r?\n/)
    .map((line, i) => ({ line: i + 1, ...parseLine(line) }))
    .filter((r) => !r.empty)
  const errors = rows.filter((r) => r.error)
  const total = rows.reduce((n, r) => n + (r.minutes || 0), 0)
  return {
    rows,
    errors,
    totalMinutes: total,
    human: `${Math.floor(total / 60)} 小时 ${total % 60} 分`,
  }
}

/** 分钟 → "x 小时 y 分" */
export function humanMinutes(min) {
  const t = Math.max(0, Math.round(min))
  return `${Math.floor(t / 60)} 小时 ${t % 60} 分`
}
