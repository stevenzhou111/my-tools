/**
 * 日期计算:日历日差、加减天数、工作日(跳过周六日)。
 * 全部按本地时区的日历日运算,不做跨时区换算;
 * 法定节假日与调休不在此处理(每年由国务院发布,纯前端无法离线获得)。
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function parseDate(s) {
  if (!DATE_RE.test(s ?? '')) return null
  const [y, m, d] = s.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  // 2026-02-31 这类不存在的日期会被 Date 顺延,校验回读值
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null
  return date
}

export function formatDate(date) {
  const p = (x) => String(x).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`
}

const DAY_MS = 24 * 60 * 60 * 1000

/** 日历日差:b - a,按本地日历日(不吃夏令时影响,先把时间归到正午) */
export function diffDays(a, b) {
  const noon = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12)
  return Math.round((noon(b) - noon(a)) / DAY_MS)
}

export function addDays(date, n) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12)
  d.setDate(d.getDate() + n)
  return d
}

function isWorkday(d) {
  const w = d.getDay()
  return w !== 0 && w !== 6
}

/** 加 n 个工作日(n 可为负);n=0 且当天是工作日则原样返回 */
export function addWorkdays(date, n) {
  let d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12)
  let remaining = n
  const step = n >= 0 ? 1 : -1
  let guard = 0
  while (remaining !== 0 && guard < 100000) {
    d.setDate(d.getDate() + step)
    if (isWorkday(d)) remaining -= step
    guard++
  }
  return d
}

/** a 到 b 之间的工作日天数(含两端中为工作日的日期);b < a 时按同区间反向计负 */
export function workdaysBetween(a, b) {
  const days = diffDays(a, b)
  if (days === 0) return isWorkday(a) ? 1 : 0
  const step = days > 0 ? 1 : -1
  let count = 0
  let cur = new Date(a.getFullYear(), a.getMonth(), a.getDate(), 12)
  for (let i = 0; i !== days; i += step) {
    if (isWorkday(cur)) count++
    cur = addDays(cur, step)
  }
  if (isWorkday(b)) count++
  return count
}

export const WEEKDAY_NAMES = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

export function weekdayName(date) {
  return WEEKDAY_NAMES[date.getDay()]
}