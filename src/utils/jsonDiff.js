/**
 * JSON 结构化对比:递归展平为路径级差异(新增/删除/变更),数组按下标对齐。
 * 路径以 a.b[0].c 形式表示;输出条目数有上限,防止超大对象刷屏。
 */

const MAX_ENTRIES = 500

function fmt(v) {
  if (v === undefined) return undefined
  if (v === null) return 'null'
  if (typeof v === 'string') return JSON.stringify(v)
  return JSON.stringify(v)
}

function typeOf(v) {
  if (v === null) return 'null'
  if (Array.isArray(v)) return 'array'
  return typeof v
}

function isContainer(v) {
  const t = typeOf(v)
  return t === 'object' || t === 'array'
}

/**
 * @returns {{ entries:{path,type:'add'|'remove'|'change',old?,new?}[], total, truncated }}
 */
export function diffJson(a, b, { maxEntries = MAX_ENTRIES } = {}) {
  const entries = []
  let total = 0
  let truncated = false

  const push = (path, type, old, now) => {
    total++
    if (entries.length < maxEntries) entries.push({ path, type, old: fmt(old), new: fmt(now) })
    else truncated = true
  }

  function walk(path, va, vb) {
    const ta = typeOf(va)
    const tb = typeOf(vb)
    // 类型不同(含 object/array 之别)按整体变更处理,不再下钻
    if (ta !== tb) {
      push(path, 'change', va, vb)
      return
    }
    if (ta === 'object') {
      const keys = [...new Set([...Object.keys(va), ...Object.keys(vb)])]
      for (const k of keys) {
        const childPath = path ? `${path}.${k}` : k
        if (!(k in va)) push(childPath, 'add', undefined, vb[k])
        else if (!(k in vb)) push(childPath, 'remove', va[k], undefined)
        else walk(childPath, va[k], vb[k])
      }
      return
    }
    if (ta === 'array') {
      const len = Math.max(va.length, vb.length)
      for (let i = 0; i < len; i++) {
        const childPath = `${path}[${i}]`
        if (i >= va.length) push(childPath, 'add', undefined, vb[i])
        else if (i >= vb.length) push(childPath, 'remove', va[i], undefined)
        else walk(childPath, va[i], vb[i])
      }
      return
    }
    // 标量:严格相等(区分 1 与 "1" 由上面的类型分支处理)
    if (va !== vb) push(path, 'change', va, vb)
  }

  walk('', a, b)
  return { entries, total, truncated }
}

/** 差异条目渲染成 diff 文本行 */
export function renderDiff(entries) {
  return entries
    .map((e) => {
      const sign = e.type === 'add' ? '+' : e.type === 'remove' ? '-' : '~'
      if (e.type === 'add') return `${sign} ${e.path} = ${e.new}(新增)`
      if (e.type === 'remove') return `${sign} ${e.path} = ${e.old}(删除)`
      return `${sign} ${e.path}: ${e.old} → ${e.new}`
    })
    .join('\n')
}
