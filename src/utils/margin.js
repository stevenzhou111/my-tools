/**
 * 毛利/加价计算:零售与电商定价的两套口径一次算清。
 * 毛利率 = 毛利 ÷ 售价(售价口径);加价率( Markup )= 毛利 ÷ 成本(成本口径)。
 * 二者会互相换算:毛利率 20% 对应加价率 25%,别混用。
 */

/**
 * 由成本与售价算利润结构。
 * @returns {{profit:number, marginRate:number, markupRate:number}}
 */
export function marginStats(cost, price) {
  if (!(cost >= 0)) throw new Error('成本不能为负')
  if (!(price > 0)) throw new Error('售价需要大于 0')
  const profit = price - cost
  if (profit < 0) throw new Error('售价低于成本,这笔是亏本买卖:毛利为负')
  const r2 = (v) => Math.round(v * 1000) / 1000
  return {
    profit: r2(profit),
    marginRate: r2(profit / price), // 毛利率(占售价)
    markupRate: r2(profit / cost), // 加价率(占成本);成本为 0 时为 Infinity
  }
}

/** 由成本与目标毛利率反推定价:售价 = 成本 ÷ (1 − 毛利率) */
export function priceForMargin(cost, marginRate) {
  if (!(cost > 0)) throw new Error('成本需要大于 0 才能反推定价')
  if (!(marginRate > 0 && marginRate < 1)) throw new Error('目标毛利率需在 0 ~ 100% 之间(不含 100%)')
  return Math.round((cost / (1 - marginRate)) * 100) / 100
}

/** 由成本与目标加价率反推定价:售价 = 成本 × (1 + 加价率) */
export function priceForMarkup(cost, markupRate) {
  if (!(cost > 0)) throw new Error('成本需要大于 0 才能反推定价')
  if (!(markupRate > 0)) throw new Error('目标加价率需大于 0')
  return Math.round(cost * (1 + markupRate) * 100) / 100
}

/** 两套口径互转:毛利率 ↔ 加价率 */
export function marginToMarkup(marginRate) {
  if (!(marginRate > 0 && marginRate < 1)) throw new Error('毛利率需在 0 ~ 100% 之间')
  return marginRate / (1 - marginRate)
}

export function markupToMargin(markupRate) {
  if (!(markupRate > 0)) throw new Error('加价率需大于 0')
  return markupRate / (1 + markupRate)
}
