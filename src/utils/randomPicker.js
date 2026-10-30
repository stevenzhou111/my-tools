/**
 * 随机点名 / 分组:纯函数,便于用固定种子复现测试。
 */

/**
 * 把自由文本拆成名单:按换行 / 逗号(中英文)/ 顿号 / 分号 / Tab 分隔,
 * 去空项与重复项(重复点名没有意义,保留首次出现顺序)。
 */
export function splitNames(text) {
  const seen = new Set()
  const out = []
  for (const raw of String(text ?? '').split(/[\n,，、;\t;]+/)) {
    const name = raw.trim()
    if (name && !seen.has(name)) {
      seen.add(name)
      out.push(name)
    }
  }
  return out
}

/** Fisher-Yates 洗牌(rng 可注入以便测试复现) */
export function shuffle(arr, rng = Math.random) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** 抽一个;空名单返回 null */
export function pickOne(names, rng = Math.random) {
  if (!names.length) return null
  return names[Math.floor(rng() * names.length)]
}

/**
 * 均衡分组:洗牌后按「轮发」分配,组数 2–20;人数不足组数时多余的组为空并裁掉。
 * @returns {string[][]} 长度 ≤ groupCount
 */
export function groupNames(names, groupCount, rng = Math.random) {
  const count = Math.min(20, Math.max(2, Math.floor(Number(groupCount) || 2)))
  const pool = shuffle(names, rng)
  const groups = Array.from({ length: Math.min(count, Math.max(1, pool.length)) }, () => [])
  pool.forEach((name, i) => groups[i % groups.length].push(name))
  return groups.filter((g) => g.length)
}
