/**
 * 预产期与孕周计算:临床通用的 Naegele 法则(末次月经第一天 + 280 天),
 * 月经周期不等于 28 天时按「280 + (周期 − 28)」修正。
 * 整个孕期 40 孕周(280 天),孕周 = 已过天数 / 7 向下取整。
 */

export const MILESTONES = [
  { week: [11, 13], label: 'NT 检查(11~13⁺⁶ 周)' },
  { week: [15, 20], label: '唐氏筛查 / 无创 DNA(15~20 周)' },
  { week: [20, 24], label: '大排畸超声(20~24 周)' },
  { week: [24, 28], label: '妊娠糖尿病筛查(24~28 周)' },
  { week: [28, 36], label: '每 2 周一次产检(28~36 周)' },
  { week: [37, 40], label: '每周一次产检,足月待产(37~40 周)' },
]

/**
 * @param {string} lmpStr 末次月经第一天 'YYYY-MM-DD'
 * @param {number} cycle 月经周期天数(21~45,默认 28)
 * @param {string} [todayStr] 基准日(默认今天),便于测试
 * @returns {{error:string, data:object|null}}
 */
export function dueDateInfo(lmpStr, cycle = 28, todayStr) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(lmpStr || '')
  if (!m) return { error: '请选择末次月经第一天', data: null }
  const lmp = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  lmp.setHours(0, 0, 0, 0)
  if (Number(m[3]) !== lmp.getDate()) return { error: '这个日期不存在,请检查', data: null }

  const c = Number(cycle)
  if (!Number.isFinite(c) || c < 21 || c > 45) return { error: '月经周期需在 21~45 天之间', data: null }

  const today = todayStr
    ? (() => {
        const t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(todayStr)
        return t ? new Date(Number(t[1]), Number(t[2]) - 1, Number(t[3])) : new Date()
      })()
    : new Date()
  today.setHours(0, 0, 0, 0)

  if (lmp > today) return { error: '末次月经晚于今天,请检查日期', data: null }

  const totalDays = 280 + Math.round(c - 28)
  const due = new Date(lmp.getTime() + totalDays * 86400000)

  const passed = Math.floor((today - lmp) / 86400000)
  const week = Math.min(40, Math.floor(passed / 7))
  const day = passed % 7
  const remain = Math.round((due - today) / 86400000)

  // 孕早中晚三期(临床口径:<14 周、14~27 周、≥28 周)
  const stage = passed < 14 * 7 ? '孕早期(1~13 周)' : passed < 28 * 7 ? '孕中期(14~27 周)' : '孕晚期(28~40 周)'

  return {
    error: '',
    data: {
      dueYm: `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}`,
      dueText: `${due.getFullYear()} 年 ${due.getMonth() + 1} 月 ${due.getDate()} 日`,
      dueTs: due.getTime(),
      totalDays,
      passed,
      week,
      day,
      stage,
      remain,
      born: remain <= 0,
      progress: Math.min(100, Math.round((passed / totalDays) * 100)),
      currentMilestones: MILESTONES.filter((ms) => passed >= ms.week[0] * 7 && passed <= (ms.week[1] + 1) * 7),
      nextMilestone: MILESTONES.find((ms) => passed < ms.week[0] * 7) || null,
    },
  }
}
