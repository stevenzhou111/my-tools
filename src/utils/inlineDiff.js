/**
 * 行内差异:把行级 diff 中配对的删除/新增行再做一次字符级 LCS,
 * 标出行内具体改了哪些字符。单行限长 500 字符、配对上限 200 对,
 * 超限时整行按删除/新增处理,避免 O(n·m) 失控。
 */

const INLINE_LIMIT = 500

/** 两个字符串的字符级 LCS 段:[{ text, op: 'same' | 'del' }] 相对 a 而言 */
function charDiff(a, b) {
  const n = a.length
  const m = b.length
  // dp[i][j] = a[i..] 与 b[j..] 的公共子序列长度
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const aSegs = []
  const bSegs = []
  let i = 0
  let j = 0
  const push = (segs, op, text) => {
    const last = segs[segs.length - 1]
    if (last && last.op === op) last.text += text
    else segs.push({ op, text })
  }
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      push(aSegs, 'same', a[i])
      push(bSegs, 'same', b[j])
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      push(aSegs, 'del', a[i++])
    } else {
      push(bSegs, 'add', b[j++])
    }
  }
  while (i < n) push(aSegs, 'del', a[i++])
  while (j < m) push(bSegs, 'add', b[j++])
  return { aSegs, bSegs }
}

/**
 * 装饰行级 ops:相邻的删除块与新增块按顺序配对做行内标注。
 * @returns 行对象数组 { t, s, segs? },segs 为 [{ text, op }],t/s 语义不变
 */
export function decorateOps(ops, maxPairs = 200) {
  const out = []
  let i = 0
  let pairs = 0
  while (i < ops.length) {
    if (ops[i].t !== '-' && ops[i].t !== '+') {
      out.push(ops[i])
      i++
      continue
    }
    // 收集相邻的删除块与新增块
    const dels = []
    const adds = []
    while (i < ops.length && ops[i].t === '-') dels.push(ops[i++])
    while (i < ops.length && ops[i].t === '+') adds.push(ops[i++])
    const pairCount = Math.min(dels.length, adds.length)
    for (let k = 0; k < dels.length; k++) {
      if (k < pairCount && pairs < maxPairs) {
        const a = dels[k].s.slice(0, INLINE_LIMIT)
        const b = adds[k].s.slice(0, INLINE_LIMIT)
        const { aSegs, bSegs } = charDiff(a, b)
        pairs++
        out.push({ ...dels[k], segs: aSegs })
        out.push({ ...adds[k], segs: bSegs })
      } else {
        out.push(dels[k])
        if (k < pairCount) out.push(adds[k])
      }
    }
    // 新增比删除多的部分(未配对)原样输出
    for (let k = pairCount; k < adds.length; k++) out.push(adds[k])
  }
  return out
}
