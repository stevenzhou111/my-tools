/**
 * JSON → TypeScript 类型定义。
 * 规则:
 * - 对象生成 interface,数组元素取形状并集;空数组 → unknown[]
 * - 结构相同的对象只生成一个 interface(按结构签名去重)
 * - 属性名不是合法标识符时用引号:['a-b']
 * - 根为标量/数组时输出 type 别名,根为对象时输出 interface
 */

function pascal(key, fallback = 'Item') {
  const parts = String(key)
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
  return parts.join('') || fallback
}

const IDENT_RE = /^[$A-Za-z_][$\w]*$/

function propKey(key) {
  return IDENT_RE.test(key) ? key : `'${key.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
}

export function jsonToTs(text, rootName = 'Root') {
  const s = String(text ?? '').trim()
  if (!s) return { code: '', error: '' }
  let data
  try {
    data = JSON.parse(s)
  } catch (e) {
    return { code: '', error: e.message }
  }

  const interfaces = [] // { name, body: string[] },生成顺序为子结构在前
  const bySignature = new Map() // 结构签名 → interface 名
  const usedNames = new Set()

  const uniqueName = (base) => {
    let name = base
    let i = 2
    while (usedNames.has(name)) name = `${base}${i++}`
    usedNames.add(name)
    return name
  }

  function typeOf(value, hint) {
    if (value === null) return 'null'
    if (typeof value === 'string') return 'string'
    if (typeof value === 'number') return 'number'
    if (typeof value === 'boolean') return 'boolean'

    if (Array.isArray(value)) {
      const kinds = [...new Set(value.map((v) => typeOf(v, `${hint}Item`)))]
      if (kinds.length === 0) return 'unknown[]'
      if (kinds.length === 1) return `${kinds[0]}[]`
      return `(${kinds.join(' | ')})[]`
    }

    const entries = Object.entries(value).map(([k, v]) => {
      const childHint = hint + pascal(k)
      return [propKey(k), typeOf(v, childHint)]
    })
    const sig = `{${entries.map(([k, t]) => `${k}:${t}`).join('|')}}`
    if (bySignature.has(sig)) return bySignature.get(sig)

    const name = uniqueName(pascal(hint, 'Obj'))
    bySignature.set(sig, name)
    interfaces.push({ name, body: entries.map(([k, t]) => `${k}: ${t};`) })
    return name
  }

  const rootType = typeOf(data, rootName)

  // 倒序输出让根接口排最前
  const blocks = [...interfaces]
    .reverse()
    .map((i) => `export interface ${i.name} {\n${i.body.map((l) => '  ' + l).join('\n')}\n}`)

  const lines = [...blocks]
  if (!interfaces.some((i) => i.name === pascal(rootName))) {
    // 根是标量或数组(没有对应 interface),补一个 type 别名
    lines.unshift(`export type ${pascal(rootName)} = ${rootType};`)
  }

  return { code: lines.join('\n\n'), error: '' }
}