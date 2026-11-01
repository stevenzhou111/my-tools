/**
 * 税前 ↔ 税后工资换算:五险一金明细 + 累计预扣个税。
 * 五险一金按个人部分常用比例(养老 8%、医疗 2%、失业 0.5%),公积金比例可调(5%~12%);
 * 个税复用 incomeTax 的累计预扣法,假设全年月薪与扣除额恒定。
 */
import { salarySchedule } from './incomeTax'

export const SOCIAL_RATES = [
  { id: 'pension', label: '养老保险', rate: 0.08 },
  { id: 'medical', label: '医疗保险', rate: 0.02 },
  { id: 'unemployment', label: '失业保险', rate: 0.005 },
]

const r2 = (x) => Math.round(x * 100) / 100

/**
 * 个人五险一金明细。
 * @param {number} base 缴费基数(常等于月薪,受当地上下限约束请自行填实际值)
 * @param {number} housingPct 公积金个人比例(5~12)
 */
export function insuranceBreakdown(base, housingPct = 12) {
  base = Math.max(0, Number(base) || 0)
  const housing = Math.min(12, Math.max(5, Number(housingPct) || 12)) / 100
  const parts = SOCIAL_RATES.map((sr) => ({ ...sr, amount: r2(base * sr.rate) }))
  const housingAmount = r2(base * housing)
  return {
    parts,
    housing: { label: '住房公积金', rate: housing, amount: housingAmount },
    total: r2(parts.reduce((s, p) => s + p.amount, 0) + housingAmount),
  }
}

/**
 * 税前 → 税后(全年恒定口径)。
 * @returns {{insurance:object, taxFirst:number, netFirst:number, avgNet:number, annualTax:number, schedule:object}}
 *  netFirst:第 1 月到手(个税最低的月份);avgNet:全年平均月到手(跳档摊平后)
 */
export function netFromGross(gross, { base, housingPct = 12, special = 0 } = {}) {
  gross = Math.max(0, Number(gross) || 0)
  const b = Math.max(0, Number(base) || gross)
  const insurance = insuranceBreakdown(b, housingPct)
  special = Math.max(0, Number(special) || 0)
  const schedule = salarySchedule({ salary: gross, insurance: insurance.total, special, months: 12 })
  return {
    insurance,
    taxFirst: schedule.rows[0].tax,
    netFirst: schedule.rows[0].net,
    netLast: schedule.rows[schedule.rows.length - 1].net,
    avgNet: r2(schedule.totalNet / 12),
    annualTax: schedule.totalTax,
    annualNet: schedule.totalNet,
    schedule,
  }
}

/** 税后 → 税前:对「全年平均月到手」二分反推 */
export function grossFromNet(net, { housingPct = 12, special = 0 } = {}) {
  net = Number(net)
  if (!Number.isFinite(net) || net <= 0) throw new Error('请输入大于 0 的税后月薪')
  special = Math.max(0, Number(special) || 0)
  const target = Math.min(net, 1e7)
  let lo = 0
  let hi = Math.max(100000, target * 3)
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    const { avgNet } = netFromGross(mid, { base: mid, housingPct, special })
    if (avgNet < target) lo = mid
    else hi = mid
  }
  const gross = Math.round(((lo + hi) / 2) * 100) / 100
  const detail = netFromGross(gross, { base: gross, housingPct, special })
  return { gross, ...detail }
}
