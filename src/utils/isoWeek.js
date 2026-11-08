/**
 * ISO 8601 周历:周一为一周之始,含 1 月 4 日的那周是当年第 1 周。
 * 提供 日期→周号、年周→日期区间,周报/项目管理常用。
 */

/** Date(本地时区)→ { year, week } */
export function isoWeekOf(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = (d.getDay() + 6) % 7 // 周一=0
  d.setDate(d.getDate() - day + 3) // 移到本周周四(周四所在年份即 ISO 年)
  const isoYear = d.getFullYear()
  const jan4 = new Date(isoYear, 0, 4)
  const jan4Day = (jan4.getDay() + 6) % 7
  const week1Mon = new Date(isoYear, 0, 4 - jan4Day)
  const week = Math.round((d - week1Mon) / (7 * 86400000)) + 1
  return { year: isoYear, week }
}

/** 年 + 周号 → 该周的周一与周日(本地时区 Date) */
export function isoWeekRange(year, week) {
  if (!Number.isInteger(year) || !Number.isInteger(week) || week < 1 || week > 53) {
    throw new Error('年份需为整数,周号在 1~53 之间')
  }
  const jan4 = new Date(year, 0, 4)
  const jan4Day = (jan4.getDay() + 6) % 7
  const week1Mon = new Date(year, 0, 4 - jan4Day)
  const mon = new Date(week1Mon)
  mon.setDate(week1Mon.getDate() + (week - 1) * 7)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  return { monday: mon, sunday: sun }
}

/** 某年的 ISO 周数(52 或 53) */
export function weeksInYear(year) {
  return isoWeekOf(new Date(year, 11, 28)).week
}
