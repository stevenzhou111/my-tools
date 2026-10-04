/**
 * JSON 树查看器:把 JSON 文本解析成可折叠的树模型,并给出结构统计。
 * 与「JSON 格式化」互补:那边看文本,这边看结构。
 */

const TYPE_NAMES = {
  string: '字符串',
  number: '数字',
  boolean: '布尔',
  null: 'null',
  object: '对象',
  array: '数组',
}

export function typeName(t) {
  return TYPE_NAMES[t] ?? t
}

/**
 * 递归构建树节点。
 * @returns {{key:string|null,type:string,value:any,children:Array,size:number,depth:number}}
 *   size:该子树包含的节点总数(含自身);depth:子树最大深度(自身为 1)
 */
function buildNode(key, value) {
  if (value === null) return leaf(key, 'null', 'null')
  if (Array.isArray(value)) {
    const children = value.map((v, i) => buildNode(String(i), v))
    return container(key, 'array', children, `[${value.length}]`)
  }
  if (typeof value === 'object') {
    const children = Object.entries(value).map(([k, v]) => buildNode(k, v))
    return container(key, 'object', children, `{${children.length}}`)
  }
  return leaf(key, typeof value, value)
}

function leaf(key, type, value) {
  return { key, type, value, children: [], size: 1, depth: 1 }
}

function container(key, type, children, brace) {
  return {
    key,
    type,
    value: brace, // 折叠时显示 {n} / [n]
    children,
    size: 1 + children.reduce((s, c) => s + c.size, 0),
    depth: 1 + children.reduce((m, c) => Math.max(m, c.depth), 0),
  }
}

/**
 * @param {string} text JSON 文本
 * @returns {{root:object|null,error:string,stats:object|null}}
 */
export function buildJsonTree(text) {
  const s = String(text ?? '').trim()
  if (!s) return { root: null, error: '', stats: null }
  let data
  try {
    data = JSON.parse(s)
  } catch (e) {
    return { root: null, error: e.message, stats: null }
  }
  const root = buildNode(null, data)
  return {
    root,
    error: '',
    stats: {
      nodes: root.size,
      depth: root.depth,
      keys: countType(root, 'object'),
      arrays: countType(root, 'array'),
    },
  }
}

function countType(node, type) {
  let n = node.type === type ? 1 : 0
  for (const c of node.children) n += countType(c, type)
  return n
}

/** 面包屑路径:根为 $,对象用 .key,数组下标与特殊字符用 [i] / ['key'] */
export function nodePath(key, parentPath) {
  if (parentPath === null) return '$'
  if (key === null) return parentPath
  if (/^\d+$/.test(key)) return `${parentPath}[${key}]` // 数组下标风格
  if (/^[A-Za-z_$][\w$]*$/.test(key)) return `${parentPath}.${key}`
  return `${parentPath}[${JSON.stringify(key)}]`
}

/** 预览文本:字符串截断加引号,其余转字符串 */
export function previewValue(node, max = 60) {
  if (node.type === 'string') {
    const s = `"${node.value}"`
    return s.length > max ? s.slice(0, max) + '…"' : s
  }
  return String(node.value)
}