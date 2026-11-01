/**
 * 年龄计算:周岁(法定口径)、虚岁(按农历年,精确到春节边界)、
 * 累计生活天数 / 月数、下一个生日倒计时、生肖与星座。
 * 生肖用农历年取(solarToLunar),春节前出生不算新年生肖;超出农历表范围时退回按公历年估算。
 */

import { solarToLunar } from './lunar'

const ZODIAC = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪']
const ZODIAC_YEARS = ['猴', '鸡', '狗', '猪', '鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊'] // 1900 申猴起

const CONSTELLATIONS = [
  { name: '白羊座', until: [4, 19] },
  { name: '金牛座', until: [5, 20] },
  { name: '双子座', until: [6, 21] },
  { name: '巨蟹座', until: [7, 22] },
  { name: '狮子座', until: [8, 22] },
  { name: '处女座', until: [9, 22] },
  { name: '天秤座', until: [10, 23] },
  { name: '天蝎座', until: [11, 22] },
  { name: '射手座', until: [12, 21] },
  { name: '摩羯座', until: [12, 31] },
]
// 摩羯座跨年:12/22 ~ 1/19
function constellationOf(m, d) {
  if (m === 12 && d >= 22) return '摩羯座'
  const boundary = m === 1 && d <= 19 ? CONSTELLATIONS[9] : CONSTELLATIONS.find((c) => m * 100 + d <= c.until[0] * 100 + c.until[1])
  return boundary?.name || '摩羯座'
}

/** 2/29 生日在平年的落点:3/1 庆祝 */
function birthdayIn(year, m, d) {
  if (m === 1 && d === 29 && !isLeapYear(year)) return new Date(year, 2, 1)
  return new Date(year, m, d)
}

function isLeapYear(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
}

/**
 * @param {string} birthStr 'YYYY-MM-DD'
 * @param {string} [atStr] 基准日 'YYYY-MM-DD',缺省为今天
 * @returns {{error:string, data:object|null}}
 */
export function ageInfo(birthStr, atStr) {
  const bm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthStr || '')
  if (!bm) return { error: '请选择出生日期', data: null }
  const birth = new Date(Number(bm[1]), Number(bm[2]) - 1, Number(bm[3]))
  const at = atStr ? (() => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(atStr)
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date()
  })() : new Date()
  at.setHours(0, 0, 0, 0)
  birth.setHours(0, 0, 0, 0)

  if (Number(bm[3]) !== birth.getDate()) return { error: '这个日期不存在,请检查(如 2 月 30 日)', data: null }
  if (birth > at) return { error: '出生日期晚于基准日,时间旅行者暂不支持', data: null }
  if (birth.getFullYear() < 1900) return { error: '仅支持 1900 年及以后出生', data: null }

  // 周岁:过了生日才算一岁
  let ageYears = at.getFullYear() - birth.getFullYear()
  const hadBirthday =
    at.getMonth() > birth.getMonth() ||
    (at.getMonth() === birth.getMonth() && at.getDate() >= birth.getDate())
  if (!hadBirthday) ageYears--

  // 虚岁:出生即 1 岁,过农历年 +1(按出生日与基准日的农历年差)
  const zodiacAtBirth = solarToLunar(birth)
  const zodiacNow = solarToLunar(at)
  const lunarYearGap = zodiacNow && zodiacAtBirth ? zodiacNow.year - zodiacAtBirth.year : at.getFullYear() - birth.getFullYear()
  const xusui = lunarYearGap + 1

  // 生肖:优先按农历(春节前出生仍属上一年);超出 1900-2100 表则按公历年估算
  const zodiac = zodiacAtBirth?.zodiac || ZODIAC_YEARS[birth.getFullYear() % 12]
  const ganzhi = zodiacAtBirth?.ganzhi || ''

  // 累计月数与天数
  const totalMonths = ageYears * 12 + (at.getMonth() - birth.getMonth() + (at.getDate() >= birth.getDate() ? 0 : -1))
  const totalDays = Math.floor((at - birth) / 86400000)
  // 周数粗算
  const totalWeeks = Math.floor(totalDays / 7)

  // 下一个生日
  let next = birthdayIn(at.getFullYear(), birth.getMonth(), birth.getDate())
  if (next <= at) next = birthdayIn(at.getFullYear() + 1, birth.getMonth(), birth.getDate())
  const nextBirthdayDays = Math.round((next - at) / 86400000)
  // 基准日恰为生日时,next 已推到明年,单独判「今天就是生日」
  const birthdayToday = at.getMonth() === birth.getMonth() && at.getDate() === birth.getDate()

  return {
    error: '',
    data: {
      ageYears,
      xusui,
      zodiac,
      ganzhi,
      constellation: constellationOf(birth.getMonth() + 1, birth.getDate()),
      totalMonths: Math.max(0, totalMonths),
      totalDays,
      totalWeeks,
      totalHours: totalDays * 24,
      nextBirthday: `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`,
      nextBirthdayDays,
      birthdayToday,
    },
  }
}
