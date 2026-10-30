/**
 * 复利终值与基金定投(期末年金)未来值,及按年明细。
 * 全部为名义收益率口径,不考虑通胀与费用。
 */

/** 一次性本金按年复利 n 年后的终值 */
export function compoundFV(principal, annualRate, years) {
  return (Number(principal) || 0) * Math.pow(1 + (Number(annualRate) || 0), Number(years) || 0)
}

/** 每月定投 monthy 元、年化 annualRate,投 months 个月的未来值(期末投入,普通年金) */
export function sipFV(monthly, annualRate, months, { begin = false } = {}) {
  monthly = Math.max(0, Number(monthly) || 0)
  months = Math.max(0, Math.floor(Number(months) || 0))
  const r = (Number(annualRate) || 0) / 12
  if (months === 0 || monthly === 0) return 0
  if (r === 0) return monthly * months
  // 期末年金:f = m·[(1+r)^n − 1] / r;期初(发薪日投)再乘一个月的增值
  const fv = monthly * ((Math.pow(1 + r, months) - 1) / r)
  return begin ? fv * (1 + r) : fv
}

/**
 * 组合测算:一次性本金 + 每月定投。
 * @returns {{ rows:{year,invested,fv,interest}[], totalInvested, totalFV, totalInterest }}
 */
export function plan({ principal = 0, monthly = 0, annualRate = 0, years = 1 }) {
  principal = Math.max(0, Number(principal) || 0)
  monthly = Math.max(0, Number(monthly) || 0)
  annualRate = Number(annualRate) || 0
  years = Math.min(50, Math.max(1, Math.floor(Number(years) || 1)))

  const rows = []
  for (let y = 1; y <= years; y++) {
    const invested = principal + monthly * y * 12
    const fv = compoundFV(principal, annualRate, y) + sipFV(monthly, annualRate, y * 12)
    rows.push({ year: y, invested, fv, interest: fv - invested })
  }
  const last = rows[rows.length - 1]
  return { rows, totalInvested: last.invested, totalFV: last.fv, totalInterest: last.interest }
}
