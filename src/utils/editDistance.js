/**
 * 编辑距离(Levenshtein,插入/删除/替换各计 1)与相似度百分比。
 * 动态规划 O(mn);长文本注意内存,建议几百行以内。
 */

/** 两串的编辑距离;任一为空串时返回另一串长度 */
export function levenshtein(a, b) {
  const s = String(a ?? '')
  const t = String(b ?? '')
  if (s === t) return 0
  if (!s.length) return [...t].length
  if (!t.length) return [...s].length
  // 按码点切分,emoji 等代理对算一个字符
  const x = [...s]
  const y = [...t]
  let prev = Array.from({ length: y.length + 1 }, (_, i) => i)
  for (let i = 1; i <= x.length; i++) {
    const cur = [i]
    for (let j = 1; j <= y.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1, // 删除
        cur[j - 1] + 1, // 插入
        prev[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1), // 替换
      )
    }
    prev = cur
  }
  return prev[y.length]
}

/** 相似度 0~100:100 - 距离/较长串长度 × 100(两串全等 = 100,完全不同 = 0) */
export function similarity(a, b) {
  const x = [...String(a ?? '')]
  const y = [...String(b ?? '')]
  if (!x.length && !y.length) return 100
  const dist = levenshtein(a, b)
  return Math.round((1 - dist / Math.max(x.length, y.length)) * 100)
}
