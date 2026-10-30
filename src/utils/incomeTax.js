/**
 * 中国个人所得税·工资薪金累计预扣法(2019 年起施行)与全年一次性奖金单独计税。
 * 税率表为年度综合所得口径;预扣时以自然年累计,速算扣除数直接使用年度表。
 */

const BRACKETS = [
  { limit: 36000, rate: 0.03, quick: 0 },
  { limit: 144000, rate: 0.1, quick: 2520 },
  { limit: 300000, rate: 0.2, quick: 16920 },
  { limit: 420000, rate: 0.25, quick: 31920 },
  { limit: 660000, rate: 0.3, quick: 52920 },
  { limit: 960000, rate: 0.35, quick: 85920 },
  { limit: Infinity, rate: 0.45, quick: 181920 },
]

// 全年一次性奖金按「奖金 ÷ 12」套用月度税率表
const BONUS_BRACKETS = [
  { perMonth: 3000, rate: 0.03, quick: 0 },
  { perMonth: 12000, rate: 0.1, quick: 210 },
  { perMonth: 25000, rate: 0.2, quick: 1410 },
  { perMonth: 35000, rate: 0.25, quick: 2660 },
  { perMonth: 55000, rate: 0.3, quick: 4410 },
  { perMonth: 80000, rate: 0.35, quick: 7160 },
  { perMonth: Infinity, rate: 0.45, quick: 15160 },
]

/** 每月基本减除费用(起征点) */
export const MONTHLY_ALLOWANCE = 5000

const round2 = (x) => Math.round(x * 100) / 100

function bracketOf(taxable) {
  return BRACKETS.find((b) => taxable <= b.limit) ?? BRACKETS[BRACKETS.length - 1]
}

/** 累计应纳税所得额 → 累计应纳税额 */
export function cumulativeTax(taxable) {
  if (taxable <= 0) return 0
  const b = bracketOf(taxable)
  return taxable * b.rate - b.quick
}

/**
 * 工资薪金逐月预扣明细。
 * @param {object} p { salary 月薪, insurance 个人五险一金/月, special 专项附加扣除/月, months 计算月数 }
 * @returns {{ rows:{month,tax,cumTax,net,rate}[], totalTax, totalNet }}
 */
export function salarySchedule({ salary, insurance = 0, special = 0, months = 12 }) {
  salary = Math.max(0, Number(salary) || 0)
  insurance = Math.max(0, Number(insurance) || 0)
  special = Math.max(0, Number(special) || 0)
  months = Math.min(12, Math.max(1, Math.floor(Number(months) || 1)))

  const rows = []
  let cumTax = 0
  let totalNet = 0
  for (let m = 1; m <= months; m++) {
    const cumIncome = salary * m
    const taxable = cumIncome - MONTHLY_ALLOWANCE * m - insurance * m - special * m
    const cum = cumulativeTax(taxable)
    const tax = round2(Math.max(0, cum - cumTax))
    cumTax = round2(cumTax + tax)
    const net = round2(salary - insurance - tax)
    totalNet = round2(totalNet + net)
    rows.push({ month: m, tax, cumTax, net, rate: taxable > 0 ? bracketOf(taxable).rate : 0 })
  }
  return { rows, totalTax: cumTax, totalNet }
}

/**
 * 全年一次性奖金单独计税。
 * @returns {{ tax, rate, after }} 奖金为 0 / 负数时税额为 0
 */
export function annualBonusTax(bonus) {
  bonus = Math.max(0, Number(bonus) || 0)
  if (bonus === 0) return { tax: 0, rate: 0, after: 0 }
  const perMonth = bonus / 12
  const b = BONUS_BRACKETS.find((x) => perMonth <= x.perMonth)
  const tax = round2(bonus * b.rate - b.quick)
  return { tax, rate: b.rate, after: round2(bonus - tax) }
}
