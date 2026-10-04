/**
 * 时区换算:基于 Intl(浏览器/Node 自带 ICU,无第三方依赖,含夏令时)。
 */

export const ZONES = [
  { tz: 'Asia/Shanghai', label: '北京' },
  { tz: 'Asia/Hong_Kong', label: '香港' },
  { tz: 'Asia/Taipei', label: '台北' },
  { tz: 'Asia/Tokyo', label: '东京' },
  { tz: 'Asia/Seoul', label: '首尔' },
  { tz: 'Asia/Singapore', label: '新加坡' },
  { tz: 'Asia/Kolkata', label: '孟买' },
  { tz: 'Asia/Dubai', label: '迪拜' },
  { tz: 'Europe/London', label: '伦敦' },
  { tz: 'Europe/Berlin', label: '柏林' },
  { tz: 'Europe/Moscow', label: '莫斯科' },
  { tz: 'America/New_York', label: '纽约' },
  { tz: 'America/Chicago', label: '芝加哥' },
  { tz: 'America/Los_Angeles', label: '洛杉矶' },
  { tz: 'America/Sao_Paulo', label: '圣保罗' },
  { tz: 'Australia/Sydney', label: '悉尼' },
  { tz: 'Pacific/Auckland', label: '奥克兰' },
  { tz: 'UTC', label: 'UTC' },
]

const partsFormatterCache = new Map()

function formatter(tz) {
  let f = partsFormatterCache.get(tz)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short',
      hour12: false,
    })
    partsFormatterCache.set(tz, f)
  }
  return f
}

/** 该时区相对 UTC 的分钟偏移(含夏令时) */
export function tzOffsetMin(tz, at) {
  const parts = Object.fromEntries(
    formatter(tz).formatToParts(at).map((p) => [p.type, p.value]),
  )
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24, // en-US 的 24:xx 只出现在午夜,归一化
    Number(parts.minute),
  )
  return Math.round((asUTC - at.getTime()) / 60000)
}

export function offsetLabel(min) {
  const sign = min < 0 ? '-' : '+'
  const abs = Math.abs(min)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return `UTC${sign}${h}${m ? ':' + String(m).padStart(2, '0') : ''}`
}

const WEEKDAY_ZH = { Mon: '周一', Tue: '周二', Wed: '周三', Thu: '周四', Fri: '周五', Sat: '周六', Sun: '周日' }

/**
 * 计算一个时刻在各时区的本地时间。
 * @param {Date} at 绝对时刻
 * @returns {Array<{tz,label,date,time,weekday,offsetMin,offset,isWorkday}>}
 */
export function zoneRows(at) {
  return ZONES.map(({ tz, label }) => {
    const parts = Object.fromEntries(
      formatter(tz).formatToParts(at).map((p) => [p.type, p.value]),
    )
    const offset = tzOffsetMin(tz, at)
    const hour = Number(parts.hour) % 24
    return {
      tz,
      label,
      date: `${parts.year}-${parts.month}-${parts.day}`,
      time: `${String(hour).padStart(2, '0')}:${parts.minute}`,
      weekday: WEEKDAY_ZH[parts.weekday] ?? parts.weekday,
      offsetMin: offset,
      offset: offsetLabel(offset),
      // 9:00 ~ 18:00 本地视为工作时间,方便挑开会时间
      isWorkday: hour >= 9 && hour < 18,
    }
  })
}

/** datetime-local 值 → Date:按指定时区的墙上时间解析 */
export function wallTimeToInstant(localStr, tz) {
  // 先按 UTC 字面量解析,再用目标时区偏移修正
  const naive = new Date(`${localStr}Z`.replace(' ', 'T'))
  if (Number.isNaN(naive.getTime())) return null
  const offset = tzOffsetMin(tz, naive)
  return new Date(naive.getTime() - offset * 60000)
}