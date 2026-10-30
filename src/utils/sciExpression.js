/**
 * 科学计算器:递归下降解析,支持三角/反三角(可切换角度制)、指数对数、
 * 常数 pi / e 与幂运算。与面板计算器(calcExpression)互不依赖——
 * 那边刻意只支持四则,这里扩展函数与常数。
 */

const FUNCS = {
  sin: { fn: Math.sin, angle: 'in' },
  cos: { fn: Math.cos, angle: 'in' },
  tan: { fn: Math.tan, angle: 'in' },
  asin: { fn: Math.asin, angle: 'out' },
  acos: { fn: Math.acos, angle: 'out' },
  atan: { fn: Math.atan, angle: 'out' },
  sqrt: { fn: Math.sqrt },
  abs: { fn: Math.abs },
  ln: { fn: Math.log },
  log: { fn: Math.log10 },
  exp: { fn: Math.exp },
  round: { fn: Math.round },
  floor: { fn: Math.floor },
  ceil: { fn: Math.ceil },
}

const CONSTANTS = { pi: Math.PI, e: Math.E }
const DEG = Math.PI / 180

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
    if (/[a-zA-Z_]/.test(c)) {
      const m = /[a-zA-Z_]+/.exec(s.slice(i))
      tokens.push({ t: 'word', v: m[0] })
      i += m[0].length
      continue
    }
    if ('+-*/^(),'.includes(c)) {
      tokens.push({ t: c })
      i++
      continue
    }
    return null
  }
  return tokens
}

/**
 * @param {string} raw 表达式,如 "sin(30)^2 + ln(e)"
 * @param {{degrees?:boolean}} opts degrees=true 时三角函数入参与反三角结果均为角度制
 * @returns {{value:number}|{value:null}}
 */
export function evalSci(raw, { degrees = false } = {}) {
  const tokens = tokenize(String(raw ?? ''))
  if (!tokens || !tokens.length) return { value: null }
  let pos = 0

  const peek = () => tokens[pos]
  const isOp = (...ops) => {
    const tk = tokens[pos]
    return tk && tk.t.length === 1 && ops.includes(tk.t) ? tk.t : null
  }

  function applyFunc(name, x) {
    const f = FUNCS[name]
    if (!f) return null
    const arg = f.angle === 'in' && degrees ? x * DEG : x
    const r = f.fn(arg)
    if (Number.isNaN(r)) return null
    return f.angle === 'out' && degrees ? r / DEG : r
  }

  function expr() {
    let v = term()
    if (v === null) return null
    for (let o = isOp('+', '-'); o; o = isOp('+', '-')) {
      pos++
      const r = term()
      if (r === null) return null
      v = o === '+' ? v + r : v - r
    }
    return v
  }

  function term() {
    let v = unary()
    if (v === null) return null
    for (let o = isOp('*', '/'); o; o = isOp('*', '/')) {
      pos++
      const r = unary()
      if (r === null) return null
      if (o === '/' && r === 0) return null
      v = o === '*' ? v * r : v / r
    }
    return v
  }

  function unary() {
    const o = isOp('+', '-')
    if (o) {
      pos++
      const v = unary()
      if (v === null) return null
      return o === '-' ? -v : v
    }
    return power()
  }

  function power() {
    const base = postfix()
    if (base === null) return null
    if (isOp('^')) {
      pos++
      const exp = unary() // 右结合
      if (exp === null) return null
      const r = Math.pow(base, exp)
      return Number.isFinite(r) ? r : null
    }
    return base
  }

  function postfix() {
    const tk = peek()
    if (!tk) return null
    if (tk.t === 'num') {
      pos++
      return tk.v
    }
    if (tk.t === 'word') {
      pos++
      const name = tk.v.toLowerCase()
      if (name in CONSTANTS) return CONSTANTS[name]
      if (isOp('(')) {
        pos++
        const arg = expr()
        if (arg === null || isOp(')') === null) return null
        pos++
        const r = applyFunc(name, arg)
        return r === null || !Number.isFinite(r) ? null : r
      }
      return null // 裸标识符(非常数、无括号)拒绝
    }
    if (tk.t === '(') {
      pos++
      const v = expr()
      if (v === null || isOp(')') === null) return null
      pos++
      return v
    }
    return null
  }

  const v = expr()
  if (v === null || pos !== tokens.length || !Number.isFinite(v)) return { value: null }
  const clean = Number(v.toPrecision(12))
  return { value: Number.isFinite(clean) ? clean : null }
}
