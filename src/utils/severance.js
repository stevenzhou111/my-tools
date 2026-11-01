/**
 * 经济补偿金测算(《劳动合同法》第 46/47/87 条口径):
 * - N:每满一年支付一个月工资;六个月以上不满一年按一年;不满六个月按半个月。
 * - N+1:无过失性辞退未提前 30 日书面通知的,额外支付一个月工资(代通知金,按上月工资,不参与封顶)。
 * - 2N:违法解除的赔偿金(第 87 条)。
 * - 封顶:月工资高于当地上年度职工月平均工资三倍的,按三倍支付且年限最高不超过 12 年。
 */

const r2 = (x) => Math.round(x * 100) / 100

/** 年限折算:N 以 0.5 为步长(满年 +1,余 6 个月以上 +1,不满 6 个月 +0.5) */
export function yearsOfService(startStr, endStr) {
  const parse = (s) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '')
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null
  }
  const start = parse(startStr)
  const end = parse(endStr)
  if (!start || !end) return { error: '请填写入职与离职日期' }
  if (end < start) return { error: '离职日期早于入职日期' }

  // 日历精确的年月差(日不满按借位)
  let years = end.getFullYear() - start.getFullYear()
  let months = end.getMonth() - start.getMonth()
  let days = end.getDate() - start.getDate()
  if (days < 0) months -= 1
  if (months < 0) {
    years -= 1
    months += 12
  }
  const totalMonths = years * 12 + months // days<0 时已向月份借位

  // 余数月 ≥6 按「六个月以上」折一年;其余不满一年但 >0 的按半个月
  const remMonths = totalMonths % 12
  const fullYears = Math.floor(totalMonths / 12)
  let n = fullYears
  if (remMonths >= 6) n += 1
  else if (remMonths > 0) n += 0.5
  if (totalMonths === 0) n = 0.5 // 干了几天也算不满六个月

  return {
    error: '',
    data: {
      years: fullYears,
      remMonths,
      n, // 以「月工资」为单位的补偿月数(0.5 步长)
      nText: n % 1 === 0 ? `${n} 个月` : `${Math.floor(n)} 个半月`,
    },
  }
}

/**
 * 补偿测算。
 * @param {object} p { start, end, wage 离职前 12 个月平均月工资, socialAvg 当地社平月工资(可选,用于三倍封顶), withNotice 是否加代通知金 }
 */
export function severance({ start, end, wage, socialAvg = 0, withNotice = false }) {
  const y = yearsOfService(start, end)
  if (y.error) return { error: y.error, data: null }
  wage = Number(wage)
  if (!Number.isFinite(wage) || wage <= 0) return { error: '请填写月工资(解除前 12 个月平均)', data: null }
  socialAvg = Math.max(0, Number(socialAvg) || 0)

  const base = { n: y.data.n }
  let capped = false
  let payWage = wage
  let n = y.data.n
  if (socialAvg > 0 && wage > socialAvg * 3) {
    // 三倍封顶:基数按三倍,年限最多 12 年
    capped = true
    payWage = r2(socialAvg * 3)
    n = Math.min(n, 12)
  }
  base.payWage = payWage
  base.nCapped = n
  base.capped = capped

  return {
    error: '',
    data: {
      ...base,
      compensationN: r2(n * payWage),
      compensationN1: r2(n * payWage + wage), // 代通知金按上月工资,不受三倍封顶约束
      compensation2N: r2(2 * n * payWage),
      noticeAmount: r2(wage),
      yearsText: `${y.data.years} 年${y.data.remMonths ? ` ${y.data.remMonths} 个月` : ''}`,
    },
  }
}
