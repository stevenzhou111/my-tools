/**
 * 购物折扣与满减凑单计算。
 * 「8.5 折」在中文语境按 price × 8.5 / 10 计;折上折按两重折扣连乘。
 * 满减支持多档(如 满 200 减 30、满 400 减 70),自动选当前最优档并给出凑到下一档的建议。
 */

/**
 * 多重折扣连乘后的到手价。
 * @param {number} price 原价
 * @param {number[]} discounts 每重折扣(8.5 表示 85 折)
 * @returns {{final:number, saved:number, rate:number}} 到手价 / 已省金额 / 实际折扣率(0~1)
 */
export function stackedDiscount(price, discounts) {
  if (!(price > 0)) throw new Error('请输入大于 0 的原价')
  for (const d of discounts) {
    if (!(d > 0 && d <= 10)) throw new Error('折扣需在 0 ~ 10 之间(8.5 表示 85 折)')
  }
  let final = price
  for (const d of discounts) final *= d / 10
  // 浮点噪声:金额保留两位
  final = Math.round(final * 100) / 100
  return {
    final,
    saved: Math.round((price - final) * 100) / 100,
    rate: final / price,
  }
}

/** 满减档位解析与校验:满 min 减 off */
export function normalizeTiers(tiers) {
  const cleaned = tiers
    .map((t) => ({ min: Number(t.min), off: Number(t.off) }))
    .filter((t) => t.min > 0 && t.off > 0)
  // 同门槛去重(保留减得多的),按门槛升序
  const byMin = new Map()
  for (const t of cleaned) {
    const prev = byMin.get(t.min)
    if (!prev || t.off > prev.off) byMin.set(t.min, t)
  }
  return [...byMin.values()].sort((a, b) => a.min - b.min)
}

/**
 * 满减凑单分析。
 * @param {number} cart 当前购物车金额
 * @param {{min:number, off:number}[]} tiers 满减档(已 normalize)
 * @returns {{save:number, tier:object|null, next:object|null, gap:number, worth:boolean, addWorth:number}}
 *  save:当前能省多少;next/gap:下一档与还差多少;worth:值得凑(gap < 增量优惠);addWorth:凑单的净收益
 */
export function manjianPlan(cart, tiers) {
  if (!(cart >= 0)) throw new Error('购物车金额不能为负')
  let hit = null
  let next = null
  for (const t of tiers) {
    if (cart >= t.min) hit = t
    else if (!next) next = t
  }
  // 命中后,下一档取门槛更高的第一个未命中档
  if (hit) next = tiers.find((t) => t.min > hit.min) || null
  const save = hit ? hit.off : 0
  const gap = next ? Math.round((next.min - cart) * 100) / 100 : 0
  // 凑单净收益 = 新档优惠 − 当前档优惠 − 凑单垫付;大于 0 才值得
  const addWorth = next ? Math.round((next.off - save - gap) * 100) / 100 : 0
  return { save, tier: hit, next, gap, worth: next ? addWorth > 0 : false, addWorth }
}
