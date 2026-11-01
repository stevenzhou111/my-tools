/**
 * 描述统计:粘贴一列数字,算均值/中位数/分位数/方差/标准差等。
 * 方差同时给出样本(n-1)与总体(n)两种口径;分位数用线性插值法(与 numpy 一致)。
 */

/** 从自由文本解析数字:支持逗号、空格、换行、顿号、分号分隔(空片段跳过) */
export function parseNumbers(text) {
  return String(text || '')
    .split(/[\s,，、;；]+/)
    .filter((t) => t !== '')
    .map((t) => Number(t))
    .filter((v) => Number.isFinite(v))
}

function quantileSorted(sorted, q) {
  if (!sorted.length) return null
  const pos = (sorted.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  if (lo === hi) return sorted[lo]
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
}

/**
 * @param {number[]} nums
 * @returns {object|null} 空数组返回 null
 */
export function describeStats(nums) {
  const list = (nums || []).filter((v) => Number.isFinite(v))
  if (!list.length) return null
  const sorted = [...list].sort((a, b) => a - b)
  const n = list.length
  const sum = list.reduce((s, v) => s + v, 0)
  const mean = sum / n
  const median = quantileSorted(sorted, 0.5)
  const sqDiff = list.reduce((s, v) => s + (v - mean) ** 2, 0)
  const popVariance = sqDiff / n
  const sampleVariance = n > 1 ? sqDiff / (n - 1) : null
  const r6 = (x) => +x.toFixed(6)
  return {
    count: n,
    sum: r6(sum),
    mean: r6(mean),
    median: r6(median),
    min: sorted[0],
    max: sorted[n - 1],
    range: r6(sorted[n - 1] - sorted[0]),
    q1: r6(quantileSorted(sorted, 0.25)),
    q3: r6(quantileSorted(sorted, 0.75)),
    iqr: r6(quantileSorted(sorted, 0.75) - quantileSorted(sorted, 0.25)),
    popVariance: r6(popVariance),
    popStd: r6(Math.sqrt(popVariance)),
    sampleVariance: sampleVariance === null ? null : r6(sampleVariance),
    sampleStd: sampleVariance === null ? null : r6(Math.sqrt(sampleVariance)),
  }
}
