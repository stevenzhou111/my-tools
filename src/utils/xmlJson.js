/**
 * XML ↔ JSON 互转(基于浏览器 DOMParser / 手写序列化)。
 *
 * 约定:
 * - 元素属性 → "@属性名" 键;元素内的直接文本 → "#text" 键;
 * - 只有文本、没有子元素且无属性的元素 → 纯字符串;
 * - 同名兄弟元素 → 数组。
 */

/** 把解析后的元素节点转为 JSON 值 */
function elementToJson(el) {
  const out = {}
  for (const attr of el.attributes) out[`@${attr.name}`] = attr.value

  const children = [...el.children]
  if (children.length === 0) {
    const text = el.textContent.trim()
    if (Object.keys(out).length === 0) return text
    if (text) out['#text'] = text
    return out
  }

  const groups = new Map()
  for (const child of children) {
    if (!groups.has(child.tagName)) groups.set(child.tagName, [])
    groups.get(child.tagName).push(elementToJson(child))
  }
  for (const [tag, values] of groups) out[tag] = values.length === 1 ? values[0] : values

  // 子元素之间夹杂的直接文本(非纯空白)
  const ownText = [...el.childNodes]
    .filter((n) => n.nodeType === 3)
    .map((n) => n.textContent.trim())
    .filter(Boolean)
    .join(' ')
  if (ownText) out['#text'] = out['#text'] ? `${out['#text']} ${ownText}` : ownText
  return out
}

/** XML 字符串 → JSON 对象。失败返回 { ok:false, error } */
export function xmlToJson(xml) {
  let doc
  try {
    doc = new DOMParser().parseFromString(xml, 'application/xml')
  } catch (e) {
    return { ok: false, error: `解析失败:${e.message}` }
  }
  const err = doc.querySelector('parsererror')
  if (err) {
    const m = err.textContent.match(/[^:]*:\s*([\s\S]+)/)
    return { ok: false, error: `XML 不合法:${(m ? m[1] : err.textContent).trim().slice(0, 200)}` }
  }
  const root = doc.documentElement
  if (!root) return { ok: false, error: 'XML 没有根元素' }
  return { ok: true, data: { [root.tagName]: elementToJson(root) } }
}

function escapeText(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function escapeAttr(s) {
  return escapeText(s).replace(/"/g, '&quot;')
}

/**
 * JSON 值序列化为 XML 片段(不带缩进的文本节点收拢为单行)。
 * @param {string} tag 元素名
 * @param value 元素内容:对象(属性/子元素)、数组(同名重复元素)、标量(文本)
 */
function valueToXml(tag, value, indent, indentUnit, lines) {
  const pad = indentUnit.repeat(indent)
  if (Array.isArray(value)) {
    for (const item of value) valueToXml(tag, item, indent, indentUnit, lines)
    return
  }
  if (value !== null && typeof value === 'object') {
    const attrs = []
    const textParts = []
    const entries = Object.entries(value)
    for (const [k, v] of entries) {
      if (k.startsWith('@') && (typeof v !== 'object' || v === null)) attrs.push(`${k.slice(1)}="${escapeAttr(v)}"`)
      else if (k === '#text') textParts.push(v)
    }
    const attrStr = attrs.length ? ' ' + attrs.join(' ') : ''
    const children = entries.filter(([k]) => !(k.startsWith('@') || k === '#text'))
    const text = textParts
      .map((t) => (typeof t === 'object' && t !== null ? '' : escapeText(t)))
      .filter(Boolean)
      .join(' ')
    if (children.length === 0) {
      lines.push(text ? `${pad}<${tag}${attrStr}>${text}</${tag}>` : `${pad}<${tag}${attrStr} />`)
    } else {
      lines.push(`${pad}<${tag}${attrStr}>${text ? text : ''}`)
      for (const [k, v] of children) valueToXml(k, v, indent + 1, indentUnit, lines)
      lines.push(`${pad}</${tag}>`)
    }
    return
  }
  const text = value === null || value === undefined ? '' : escapeText(value)
  lines.push(`${pad}<${tag}>${text}</${tag}>`)
}

/**
 * JSON → XML 字符串。顶层必须是单键对象(键即根元素名),值里的
 * "@name" 变成属性、"#text" 变成元素文本。失败返回 { ok:false, error }。
 */
export function jsonToXml(data, { declaration = true, indentUnit = '  ' } = {}) {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, error: '顶层必须是对象,键作为根元素名,例如 {"book":{"title":"…"}}' }
  }
  const keys = Object.keys(data)
  if (keys.length !== 1) {
    return { ok: false, error: `顶层只能有一个根元素,当前有 ${keys.length} 个:${keys.slice(0, 5).join(', ')}` }
  }
  if (Array.isArray(data[keys[0]])) {
    return { ok: false, error: `根元素 ${keys[0]} 的值不能是数组(XML 只允许一个根)` }
  }
  const lines = []
  if (declaration) lines.push('<?xml version="1.0" encoding="UTF-8"?>')
  valueToXml(keys[0], data[keys[0]], 0, indentUnit, lines)
  return { ok: true, data: lines.join('\n') }
}
