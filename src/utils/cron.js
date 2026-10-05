/**
 * 五段式 Cron 表达式解析与下次执行时间推算(分 时 日 月 周)。
 * 支持 * 、数字、a-b 区间、/ 步进与逗号列表;日+周同时受限时按标准
 * Cron 语义取「或」。nextRuns 逐分钟扫描,两年内找不到返回空。
 */

function parseField(str, min, max) {
  const values = new Set()
  for (const part of String(str).trim().split(',')) {
    if (!part) return { error: '存在空的字段项' }
    let body = part
    let step = 1
    let hasStep = false
    if (part.includes('/')) {
      const [b, s] = part.split('/')
      body = b
      step = Number(s)
      hasStep = true
      if (!Number.isInteger(step) || step < 1) return { error: `步进 "${s}" 不合法` }
    }
    let lo = min
    let hi = max
    if (body !== '*') {
      const range = body.split('-')
      lo = Number(range[0])
      if (range.length === 2) hi = Number(range[1])
      else if (range.length > 2) return { error: `"${part}" 不合法` }
      // 单个数字是精确值;带步进的单个数字按 Vixie 语义从该值步进到上限
      else if (!hasStep) hi = lo
      if (!Number.isInteger(lo) || !Number.isInteger(hi)) return { error: `"${part}" 不是数字` }
      if (lo < min || hi > max || lo > hi) return { error: `"${part}" 超出 ${min}-${max} 范围` }
    }
    for (let v = lo; v <= hi; v += step) values.add(v)
  }
  return { values }
}

/**
 * 解析表达式。返回 { ok, fields, error, domStar, dowStar },
 * fields 为 [分,时,日,月,周] 的 Set;domStar/dowStar 表示该字段是否为纯 *。
 */
export function parseCron(expr) {
  const parts = String(expr).trim().split(/\s+/)
  if (parts.length !== 5) return { ok: false, error: `需要 5 个字段(分 时 日 月 周),当前 ${parts.length} 个` }
  const RANGES = [
    [0, 59, '分钟'],
    [0, 23, '小时'],
    [1, 31, '日'],
    [1, 12, '月'],
    [0, 7, '周'],
  ]
  const fields = []
  for (let i = 0; i < 5; i++) {
    const [min, max, name] = RANGES[i]
    const res = parseField(parts[i], min, max)
    if (res.error) return { ok: false, error: `${name}字段 ${res.error}` }
    // 周字段把 7 归一为 0(周日)
    if (i === 4) {
      if (res.values.has(7)) {
        res.values.delete(7)
        res.values.add(0)
      }
    }
    fields.push(res.values)
  }
  return { ok: true, fields, domStar: parts[2] === '*', dowStar: parts[4] === '*' }
}

function dateMatches(d, parsed) {
  const [mins, hours, dom, mon, dow] = parsed.fields
  if (!mins.has(d.getMinutes()) || !hours.has(d.getHours()) || !mon.has(d.getMonth() + 1)) return false
  const domOk = dom.has(d.getDate())
  const dowOk = dow.has(d.getDay())
  if (!parsed.domStar && !parsed.dowStar) return domOk || dowOk
  if (!parsed.domStar) return domOk
  if (!parsed.dowStar) return dowOk
  return true
}

/**
 * 从 from(默认现在)起向后推算接下来 count 次触发时间。
 * 逐分钟扫描,上限两年;一年内没有触发会返回空数组。
 */
export function nextRuns(expr, count = 5, from = new Date()) {
  const parsed = parseCron(expr)
  if (!parsed.ok) return { ok: false, error: parsed.error, runs: [] }
  const runs = []
  const cursor = new Date(from.getTime())
  cursor.setSeconds(0, 0)
  cursor.setMinutes(cursor.getMinutes() + 1)
  const limit = 2 * 366 * 24 * 60
  for (let i = 0; i < limit && runs.length < count; i++) {
    if (dateMatches(cursor, parsed)) runs.push(new Date(cursor.getTime()))
    cursor.setMinutes(cursor.getMinutes() + 1)
  }
  return { ok: true, runs, error: runs.length ? '' : '两年内没有匹配的执行时间,请检查表达式' }
}
