/**
 * 命令面板的计算器:字符白名单 + 手写递归下降解析器求值。
 * 只允许数字与 + - * / ** ^ ( ) 运算,禁止一切标识符/属性访问。
 * 不使用 eval / Function 构造器:既无注入面,也不会被 CSP
 * (script-src 不含 unsafe-eval)在生产环境拦截。
 */

// 允许出现的字符(求值前先归一化 × ÷)
const ALLOWED = /^[0-9+\-*/().\s^×÷]+$/

function tokenize(s) {
  const tokens = []
  let i = 0
  while (i < s.length) {
    const c = s[i]
    if (c === ' ') {
      i++
      continue
    }
    if (/[0-9.]/.test(c)) {
      const m = /(?:\d+\.?\d*|\.\d+)/.exec(s.slice(i))
      if (!m) return null
      tokens.push({ t: 'num', v: Number(m[0]) })
      i += m[0].length
      continue
    }
    if ('+-*/()^'.includes(c)) {
      // ** 与 ^ 同为幂运算
      if (c === '*' && s[i + 1] === '*') {
        tokens.push({ t: 'op', v: '^' })
        i += 2
        continue
      }
      tokens.push({ t: 'op', v: c })
      i++
      continue
    }
    return null
  }
  return tokens
}

function parse(tokens) {
  let pos = 0
  const op = (...ops) => {
    const tk = tokens[pos]
    return tk && tk.t === 'op' && ops.includes(tk.v) ? tk.v : null
  }
  // expr := term (('+'|'-') term)*
  function expr() {
    let v = term()
    if (v === null) return null
    for (let o = op('+', '-'); o; o = op('+', '-')) {
      pos++
      const r = term()
      if (r === null) return null
      v = o === '+' ? v + r : v - r
    }
    return v
  }
  // term := unary (('*'|'/') unary)*
  function term() {
    let v = unary()
    if (v === null) return null
    for (let o = op('*', '/'); o; o = op('*', '/')) {
      pos++
      const r = unary()
      if (r === null) return null
      // 除零按"求不出结果"处理(与旧实现的 Infinity→null 行为一致)
      if (o === '/' && r === 0) return null
      v = o === '*' ? v * r : v / r
    }
    return v
  }
  // unary := ('+'|'-') unary | power
  function unary() {
    const o = op('+', '-')
    if (o) {
      pos++
      const v = unary()
      if (v === null) return null
      return o === '-' ? -v : v
    }
    return power()
  }
  // power := atom ('^' unary)?  — 右结合
  function power() {
    const base = atom()
    if (base === null) return null
    if (op('^')) {
      pos++
      const exp = unary()
      if (exp === null) return null
      const r = base ** exp
      return Number.isFinite(r) ? r : null
    }
    return base
  }
  function atom() {
    const tk = tokens[pos]
    if (!tk) return null
    if (tk.t === 'num') {
      pos++
      return tk.v
    }
    if (tk.v === '(') {
      pos++
      const v = expr()
      if (v === null) return null
      if (op(')') === null) return null
      pos++
      return v
    }
    return null
  }

  const v = expr()
  if (v === null || pos !== tokens.length) return null
  return v
}

/**
 * @returns {{value:number}|{value:null}} 求不出结果(空串/非法/除零等)统一返回 null,
 *   调用方据此决定是否在面板里展示计算条目。
 */
export function evalExpression(raw) {
  const rawStr = String(raw ?? '')
  const s = normalize(rawStr).trim()
  if (!s || !ALLOWED.test(rawStr)) return { value: null }
  // 连续运算符大多会被引擎各自处理,这里直接拒绝,保持行为可预期
  if (/[+\-*/]{3,}/.test(s)) return { value: null }
  const tokens = tokenize(s)
  if (!tokens || !tokens.length) return { value: null }
  const result = parse(tokens)
  if (typeof result !== 'number' || !Number.isFinite(result)) return { value: null }
  // 消除浮点噪声:0.1+0.2 → 0.3;超大到 1e21 以上交给 toPrecision 自然转科学计数
  const clean = Number(result.toPrecision(12))
  return { value: Number.isFinite(clean) ? clean : null }
}

function normalize(raw) {
  return raw.replace(/×/g, '*').replace(/÷/g, '/')
}
