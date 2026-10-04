/**
 * WCAG 颜色对比度计算(2.x / 3.x 均适用):
 * 相对亮度 L = 0.2126R + 0.7152G + 0.0722B(R/G/B 为线性化后的 0~1),
 * 对比度 = (较亮 L + 0.05) / (较暗 L + 0.05),范围 1 ~ 21。
 */

/** 解析 #RGB / #RRGGBB;非法返回 null */
export function parseHex(hex) {
  const s = String(hex ?? '').trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{3}$/.test(s)) {
    return [0, 1, 2].map((i) => parseInt(s[i] + s[i], 16))
  }
  if (/^[0-9a-fA-F]{6}$/.test(s)) {
    return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16))
  }
  return null
}

export function hex(r, g, b) {
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')
}

function linearize(channel) {
  const c = channel / 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

export function relativeLuminance([r, g, b]) {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)
}

/** 对比度,两个颜色可以是任意顺序;非法颜色返回 null */
export function contrastRatio(a, b) {
  const la = parseHex(a)
  const lb = parseHex(b)
  if (!la || !lb) return null
  const l1 = relativeLuminance(la)
  const l2 = relativeLuminance(lb)
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1]
  return (hi + 0.05) / (lo + 0.05)
}

/**
 * WCAG 2.1 判定:
 *   普通文字 AA ≥ 4.5、AAA ≥ 7;大文字(≥18pt 或 ≥14pt bold)AA ≥ 3、AAA ≥ 4.5
 * @returns {{aa:boolean,aaa:boolean,aaLarge:boolean,aaaLarge:boolean}}
 */
export function wcagLevels(ratio) {
  return {
    aa: ratio >= 4.5,
    aaa: ratio >= 7,
    aaLarge: ratio >= 3,
    aaaLarge: ratio >= 4.5,
  }
}