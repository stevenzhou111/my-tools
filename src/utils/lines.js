/**
 * 文本行整理:排序、去重、反转、打乱、编号、去空行等逐行操作。
 * 全部为「输入行数组 → 输出行数组」的纯函数,由组件按开关组合调用。
 */

/** 拆分为行(容忍 \r\n);末尾空行不算一行 */
export function splitLines(text) {
  const lines = text.split(/\r\n|\r|\n/)
  while (lines.length && lines[lines.length - 1] === '') lines.pop()
  return lines
}

/**
 * 排序。mode:
 * - 'alpha'   字母序(忽略大小写,稳定)
 * - 'numeric' 数字序(解析行首数字,非数字行排在数字行后)
 * - 'length'  按长度(短在前)
 * - 'random'  随机打乱(Fisher–Yates,crypto 级随机)
 * reverse 为 true 时反转为降序(对 random 无意义)。
 */
export function sortLines(lines, mode = 'alpha', reverse = false) {
  if (mode === 'random') {
    const arr = [...lines]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor((crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296) * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }
  const arr = [...lines]
  const sign = reverse ? -1 : 1
  arr.sort((a, b) => {
    if (mode === 'numeric') {
      const na = parseFloat(a)
      const nb = parseFloat(b)
      const aIsNum = Number.isFinite(na)
      const bIsNum = Number.isFinite(nb)
      if (aIsNum && bIsNum) return sign * (na - nb) || sign * a.localeCompare(b)
      if (aIsNum) return -1
      if (bIsNum) return 1
      return sign * a.localeCompare(b, 'zh-Hans-CN')
    }
    if (mode === 'length') {
      const d = a.length - b.length
      return sign * (d !== 0 ? d : a.localeCompare(b))
    }
    return sign * a.localeCompare(b, 'zh-Hans-CN', { sensitivity: 'base' })
  })
  return arr
}

/** 去重:保留首次出现的行,忽略行首尾空白差异 */
export function uniqueLines(lines) {
  const seen = new Set()
  return lines.filter((l) => {
    const key = l.trim()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** 加行号:start 从几开始编,pad 控制是否按最大位数补零 */
export function numberLines(lines, start = 1, pad = false) {
  const width = pad && lines.length ? String(lines.length + start - 1).length : 0
  return lines.map((l, i) => {
    const n = String(i + start)
    return `${pad ? n.padStart(width, '0') : n}. ${l}`
  })
}

/** 去除空行(纯空白也算空) */
export function removeEmpty(lines) {
  return lines.filter((l) => l.trim() !== '')
}

/** 行首行尾去空白 */
export function trimLines(lines) {
  return lines.map((l) => l.trim())
}
