/**
 * 命令面板的计算器:对输入做严格白名单校验后求值。
 * 只允许数字与 + - * / ( ) ^ 四则运算,禁止一切标识符/属性访问,
 * 因此不存在 eval 注入面;求值用 Function 构造器,但表达式已通过白名单。
 */

// 允许出现的字符(求值前做归一化,见 normalize)
const ALLOWED = /^[0-9+\-*/().\s^×÷]+$/

function normalize(raw) {
  return raw
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/\^/g, '**')
}

function balanced(expr) {
  let depth = 0
  for (const c of expr) {
    if (c === '(') depth++
    else if (c === ')') {
      depth--
      if (depth < 0) return false
    }
  }
  return depth === 0
}

/**
 * @returns {{value:number}|{value:null}} 求不出结果(空串/非法/除零等)统一返回 null,
 *   调用方据此决定是否在面板里展示计算条目。
 */
export function evalExpression(raw) {
  const s = normalize(String(raw ?? '')).trim()
  if (!s || !ALLOWED.test(String(raw ?? ''))) return { value: null }
  if (!balanced(s)) return { value: null }
  // 连续运算符大多会被引擎各自处理,这里直接拒绝,保持行为可预期
  if (/[+\-*/]{3,}/.test(s)) return { value: null }
  try {
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${s});`)()
    if (typeof result !== 'number' || !Number.isFinite(result)) return { value: null }
    // 消除浮点噪声:0.1+0.2 → 0.3;超大到 1e21 以上交给 toPrecision 自然转科学计数
    const clean = Number(result.toPrecision(12))
    return { value: Number.isFinite(clean) ? clean : null }
  } catch {
    return { value: null }
  }
}