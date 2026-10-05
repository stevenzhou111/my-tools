/**
 * 利率换算:日 / 月 / 年利率互转,支持单利(线性)与复利(利滚利)两种口径。
 * 全部以「百分数」为出入参(如 3.1 表示 3.1%),内部再换算。
 */

const DAILY_FACTOR = 365
const MONTHLY_FACTOR = 12

/**
 * 从年利率出发算出三档。
 * 单利:日 = 年/365,月 = 年/12;复利:日 = (1+年)^(1/365)-1,月 = (1+年)^(1/12)-1。
 */
export function ratesFromAnnual(annualPct, compound = false) {
  assertRate(annualPct)
  const a = annualPct / 100
  if (compound) {
    return {
      annual: annualPct,
      monthly: ((1 + a) ** (1 / MONTHLY_FACTOR) - 1) * 100,
      daily: ((1 + a) ** (1 / DAILY_FACTOR) - 1) * 100,
    }
  }
  return {
    annual: annualPct,
    monthly: (a / MONTHLY_FACTOR) * 100,
    daily: (a / DAILY_FACTOR) * 100,
  }
}

/** 把某一档利率换算成年利率(%) */
export function toAnnual(valuePct, from, compound = false) {
  assertRate(valuePct)
  if (from === 'annual') return valuePct
  const perYear = from === 'monthly' ? MONTHLY_FACTOR : DAILY_FACTOR
  const v = valuePct / 100
  if (compound) return ((1 + v) ** perYear - 1) * 100
  return v * perYear * 100
}

/** 一步到位:任意档位 → { daily, monthly, annual } 百分数 */
export function convertRate(valuePct, from, compound = false) {
  if (from !== 'daily' && from !== 'monthly' && from !== 'annual') throw new Error('from 必须是 daily / monthly / annual')
  return ratesFromAnnual(toAnnual(valuePct, from, compound), compound)
}

function assertRate(v) {
  if (!Number.isFinite(v) || v < 0 || v > 10000) throw new Error('利率必须是 0~10000 之间的数字(百分数)')
}
