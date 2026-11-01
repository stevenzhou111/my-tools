/**
 * 延迟法定退休年龄测算(全国人大常委会 2024-09-13 决定,2025-01-01 起施行)。
 *
 * 规则:自过渡期起点出生的职工,按「每 N 个月延迟 1 个月」逐步把法定退休年龄
 * 推到目标值;计算全部按出生月推进,与官方对照表一致:
 *   男职工     原 60 岁 → 63 岁,每 4 个月延迟 1 个月(1965-01 起出生)
 *   女职工55   原 55 岁 → 58 岁,每 4 个月延迟 1 个月(1970-01 起出生)
 *   女职工50   原 50 岁 → 55 岁,每 2 个月延迟 1 个月(1975-01 起出生)
 * 延迟月数 = min(需要延迟的总月数, ceil(过渡期内第 m 个月 / N)),m 自过渡期起点按月出生序号。
 */

export const RETIRE_TRACKS = [
  { id: 'male', label: '男职工', base: 60, cap: 63, step: 4, start: '1965-01' },
  { id: 'female55', label: '女职工(原 55 岁退休)', base: 55, cap: 58, step: 4, start: '1970-01' },
  { id: 'female50', label: '女职工(原 50 岁退休)', base: 50, cap: 55, step: 2, start: '1975-01' },
]

const YM_RE = /^(\d{4})-(\d{1,2})$/

/** 'YYYY-MM' → 距 0000-01 的总月数 */
function ymToIndex(ym) {
  const m = YM_RE.exec(ym)
  if (!m) return NaN
  const y = Number(m[1])
  const mo = Number(m[2])
  if (mo < 1 || mo > 12) return NaN
  return y * 12 + (mo - 1)
}

/** 总月数 → 'YYYY-MM' */
function indexToYm(idx) {
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}`
}

/**
 * 测算法定退休年龄与时间。
 * @param {string} birthYm 出生年月 'YYYY-MM'
 * @param {string} trackId RETIRE_TRACKS 中的类别
 * @returns {{delayMonths:number, ageYears:number, ageMonths:number, retireYm:string,
 *            originalYm:string, earliestYm:string, latestYm:string, before:boolean}}
 *  delayMonths:延迟月数;ageYears/ageMonths:法定退休年龄;retireYm:达到法定年龄的月份;
 *  earliestYm/latestYm:弹性提前(≤3 年且不低于原法定)与弹性延后(≤3 年)的边界月份;before:是否在改革前已退休
 */
export function retireInfo(birthYm, trackId) {
  const track = RETIRE_TRACKS.find((t) => t.id === trackId)
  if (!track) throw new Error('请选择人员类别')
  const birth = ymToIndex(birthYm)
  if (Number.isNaN(birth) || !/^(?:19|20)\d{2}-(?:0?[1-9]|1[0-2])$/.test(birthYm)) {
    throw new Error('请输入 1900 年之后的出生年月(如 1985-06)')
  }

  const start = ymToIndex(track.start)
  // 需要延迟的总月数,例如 60 → 63 需 36 个月
  const totalDelay = (track.cap - track.base) * 12
  let delayMonths = 0
  if (birth >= start) {
    // 出生在过渡期内的第几个月(1 起)
    const m = birth - start + 1
    delayMonths = Math.min(totalDelay, Math.ceil(m / track.step))
  }

  const ageMonths = track.base * 12 + delayMonths
  const retire = birth + ageMonths
  // 弹性提前:最多提前 3 年,且不得低于改革前的原法定年龄
  const earliest = Math.max(retire - 36, birth + track.base * 12)
  const latest = retire + 36

  return {
    delayMonths,
    ageYears: Math.floor(ageMonths / 12),
    ageMonths: ageMonths % 12,
    retireYm: indexToYm(retire),
    originalYm: indexToYm(birth + track.base * 12),
    earliestYm: indexToYm(earliest),
    latestYm: indexToYm(latest),
    before: birth < start,
  }
}
