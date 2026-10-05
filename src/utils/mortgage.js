/**
 * 房贷月供与还款计划计算(纯函数,无副作用)。
 * 支持等额本息 / 等额本金两种方式,以及商贷 + 公积金的组合贷款
 * (多笔贷款各自生成计划后按期号合并)。
 */

export const METHODS = {
  annuity: '等额本息',
  principal: '等额本金',
}

function assertLoan({ principal, annualRate, months }) {
  if (!Number.isFinite(principal) || principal <= 0) throw new Error('贷款金额必须大于 0')
  if (!Number.isFinite(annualRate) || annualRate < 0) throw new Error('年利率不能为负数')
  if (!Number.isInteger(months) || months <= 0) throw new Error('贷款期限必须是正整数月数')
}

/** 等额本息的固定月供;利率为 0 时退化为平摊本金 */
export function annuityPayment(principal, annualRate, months) {
  const r = annualRate / 12
  if (r === 0) return principal / months
  const pow = Math.pow(1 + r, months)
  return (principal * r * pow) / (pow - 1)
}

/**
 * 计算一笔贷款的逐期还款计划。
 * @returns {{ rows: Array<{period:number,payment:number,principal:number,interest:number,balance:number}>,
 *   firstPayment:number, lastPayment:number, totalInterest:number, totalPayment:number }}
 *   balance 为该期还完后的剩余本金;期数从 1 开始。
 */
export function loanSchedule({ principal, annualRate, months, method = 'annuity' }) {
  assertLoan({ principal, annualRate, months })
  if (method !== 'annuity' && method !== 'principal') throw new Error('未知的还款方式')

  const r = annualRate / 12
  const rows = []
  let balance = principal
  let totalInterest = 0

  if (method === 'principal') {
    // 等额本金:每期本金固定,利息按剩余本金计算,月供逐期递减
    const monthlyPrincipal = principal / months
    for (let period = 1; period <= months; period++) {
      const interest = balance * r
      const payPrincipal = period === months ? balance : monthlyPrincipal
      const payment = payPrincipal + interest
      balance -= payPrincipal
      totalInterest += interest
      rows.push({ period, payment, principal: payPrincipal, interest, balance })
    }
  } else {
    // 等额本息:月供固定;最后一期用剩余本金收尾,消除浮点尾差
    const fixed = annuityPayment(principal, annualRate, months)
    for (let period = 1; period <= months; period++) {
      const interest = balance * r
      const payPrincipal = period === months ? balance : fixed - interest
      const payment = payPrincipal + interest
      balance -= payPrincipal
      totalInterest += interest
      rows.push({ period, payment, principal: payPrincipal, interest, balance })
    }
  }

  return {
    rows,
    firstPayment: rows[0].payment,
    lastPayment: rows[rows.length - 1].payment,
    totalInterest,
    totalPayment: rows.reduce((s, row) => s + row.payment, 0),
  }
}

/**
 * 组合贷款:把多笔计划的逐期数据按期号合并(月供、本金、利息分别相加,
 * 剩余本金相加)。期数不同的贷款按各自期限参与,后面没有的按 0 处理。
 */
export function combineLoans(schedules) {
  if (!schedules.length) throw new Error('至少需要一笔贷款')
  const maxLen = Math.max(...schedules.map((s) => s.rows.length))
  const rows = []
  let totalInterest = 0
  let totalPayment = 0
  for (let i = 0; i < maxLen; i++) {
    const row = { period: i + 1, payment: 0, principal: 0, interest: 0, balance: 0 }
    for (const s of schedules) {
      const src = s.rows[i]
      if (!src) continue
      row.payment += src.payment
      row.principal += src.principal
      row.interest += src.interest
      row.balance += src.balance
    }
    totalInterest += row.interest
    totalPayment += row.payment
    rows.push(row)
  }
  return {
    rows,
    firstPayment: rows[0].payment,
    lastPayment: rows[rows.length - 1].payment,
    totalInterest,
    totalPayment,
    totalPrincipal: rows[0].balance,
  }
}

/** 把逐期计划按年汇总:第 n 年的还款额 / 本金 / 利息 / 年末剩余本金 */
export function yearlySummary(rows, perYear = 12) {
  const years = []
  for (let i = 0; i < rows.length; i += perYear) {
    const chunk = rows.slice(i, i + perYear)
    years.push({
      year: years.length + 1,
      payment: chunk.reduce((s, r) => s + r.payment, 0),
      principal: chunk.reduce((s, r) => s + r.principal, 0),
      interest: chunk.reduce((s, r) => s + r.interest, 0),
      balance: chunk[chunk.length - 1].balance,
    })
  }
  return years
}

/**
 * 提前还款测算:第 afterPeriod 期后一次性额外偿还 extra 本金,给出两种走向的对比。
 * - keepTerm:期限不变,剩余本金重算月供(减月供);
 * - keepPay:月供不变,解出新的剩余期数(缩年限;仅等额本息适用,等额本金月供本身逐期递减)。
 * extra 大于等于剩余本金时视为一次结清(settled)。
 * @returns {{ settled:boolean, balanceAfter:number, baselineRemainingInterest:number, savedInterest:number,
 *   keepTerm:{months,firstPayment,totalInterest,savedInterest}|null,
 *   keepPay:{months,firstPayment,totalInterest,savedInterest}|null }}
 */
export function prepayOptions({ principal, annualRate, months, method = 'annuity', afterPeriod, extra }) {
  assertLoan({ principal, annualRate, months })
  if (method !== 'annuity' && method !== 'principal') throw new Error('未知的还款方式')
  if (!Number.isInteger(afterPeriod) || afterPeriod < 1 || afterPeriod >= months) {
    throw new Error('提前还款期数必须在第 1 期到最后一期之前')
  }
  if (!Number.isFinite(extra) || extra <= 0) throw new Error('提前还款金额必须大于 0')

  const base = loanSchedule({ principal, annualRate, months, method })
  const balanceAfter = base.rows[afterPeriod - 1].balance
  const baselineRemainingInterest =
    base.totalInterest - base.rows.slice(0, afterPeriod).reduce((s, r) => s + r.interest, 0)

  if (extra >= balanceAfter) {
    return { settled: true, balanceAfter, baselineRemainingInterest, savedInterest: baselineRemainingInterest, keepTerm: null, keepPay: null }
  }

  const B = balanceAfter - extra
  const keepTermSchedule = loanSchedule({ principal: B, annualRate, months: months - afterPeriod, method })
  const keepTerm = {
    months: months - afterPeriod,
    firstPayment: keepTermSchedule.firstPayment,
    totalInterest: keepTermSchedule.totalInterest,
    savedInterest: baselineRemainingInterest - keepTermSchedule.totalInterest,
  }

  let keepPay = null
  if (method === 'annuity') {
    const r = annualRate / 12
    const target = base.rows[0].payment
    if (target > r * B) {
      const nExact = Math.log(target / (target - r * B)) / Math.log(1 + r)
      const nNew = Math.min(Math.ceil(nExact), months - afterPeriod)
      const s = loanSchedule({ principal: B, annualRate, months: nNew, method: 'annuity' })
      keepPay = {
        months: nNew,
        firstPayment: s.firstPayment,
        totalInterest: s.totalInterest,
        savedInterest: baselineRemainingInterest - s.totalInterest,
      }
    }
  }

  return { settled: false, balanceAfter, baselineRemainingInterest, savedInterest: 0, keepTerm, keepPay }
}
