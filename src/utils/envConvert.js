/**
 * .env 与 JSON / YAML 扁平键值互转。
 * 只支持扁平配置;嵌套对象明确报错,避免把配置结构悄悄压平。
 */
import { load as yamlLoad, dump as yamlDump } from 'js-yaml'

const ENV_KEY_RE = /^[A-Za-z_][A-Za-z0-9_.-]*$/
const ENV_LINE_RE = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_.-]*)\s*=\s*(.*)$/

function readQuoted(s, quote) {
  let inner = ''
  for (let i = 1; i < s.length; i++) {
    const ch = s[i]
    if (quote === '"' && ch === '\\' && i + 1 < s.length) {
      inner += ch + s[i + 1]
      i++
      continue
    }
    if (ch === quote) return { inner, closed: true }
    inner += ch
  }
  return { inner, closed: false }
}

function unescapeDouble(s) {
  return s.replace(/\\(.)/g, (_, ch) => {
    switch (ch) {
      case 'n': return '\n'
      case 'r': return '\r'
      case 't': return '\t'
      case '"': return '"'
      case '\\': return '\\'
      case '$': return '$'
      default: return ch
    }
  })
}

function parseEnvValue(raw, lineNo, warnings) {
  const s = raw.trim()
  if (!s) return ''
  if (s[0] === '"' || s[0] === "'") {
    const quote = s[0]
    const { inner, closed } = readQuoted(s, quote)
    if (!closed) warnings.push(`第 ${lineNo} 行引号未闭合,已按原文解析`)
    return quote === '"' ? unescapeDouble(inner) : inner
  }
  // 未加引号时,空白后的 # 视为行内注释;紧贴值的 # 保留(如 URL 片段)
  const withoutComment = s.replace(/\s+#.*$/, '')
  return withoutComment.trim()
}

export function parseEnv(text) {
  const data = {}
  const warnings = []
  let hasComment = false
  const lines = String(text ?? '').replace(/^\uFEFF/, '').split(/\r?\n/)

  lines.forEach((line, index) => {
    const trimmed = line.trim()
    if (!trimmed) return
    if (trimmed.startsWith('#')) {
      hasComment = true
      return
    }
    const m = ENV_LINE_RE.exec(line)
    if (!m) {
      warnings.push(`第 ${index + 1} 行不是有效的 KEY=VALUE,已跳过`)
      return
    }
    const key = m[1]
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      warnings.push(`键 ${key} 重复,后者覆盖前者`)
    }
    data[key] = parseEnvValue(m[2], index + 1, warnings)
  })

  if (hasComment) warnings.push('注释不会保留到转换结果')
  return { data, warnings }
}

export function normalizeFlatData(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { data: {}, error: '顶层必须是对象(键值映射),例如 { "KEY": "value" }', warnings: [] }
  }
  const data = {}
  for (const [key, raw] of Object.entries(input)) {
    if (!ENV_KEY_RE.test(key)) {
      return {
        data: {},
        error: `键「${key}」不是合法的环境变量名(需字母或下划线开头,可含数字、点、横线)`,
        warnings: [],
      }
    }
    if (raw === null || raw === undefined) {
      data[key] = ''
      continue
    }
    if (Array.isArray(raw)) {
      if (raw.some((v) => v !== null && typeof v === 'object')) {
        return { data: {}, error: `键 ${key} 的数组包含对象,无法转换为 .env`, warnings: [] }
      }
      data[key] = raw.map((v) => (v === null ? '' : String(v))).join(',')
      continue
    }
    if (typeof raw === 'object') {
      return { data: {}, error: `键 ${key} 是嵌套对象,暂不支持转换(请先展平)`, warnings: [] }
    }
    data[key] = String(raw)
  }
  return { data, error: '', warnings: [] }
}

function quoteEnvValue(value) {
  if (value === '') return '""'
  if (!/[\s"'\\#=$`]/.test(value)) return value
  const escaped = value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
  return `"${escaped}"`
}

export function stringifyEnv(data, options = {}) {
  const prefix = options.exportPrefix ? 'export ' : ''
  const entries = Object.entries(data)
  if (!entries.length) return ''
  return entries.map(([key, value]) => `${prefix}${key}=${quoteEnvValue(String(value))}`).join('\n') + '\n'
}

function serializeStructured(data, format) {
  if (format === 'json') return JSON.stringify(data, null, 2)
  return yamlDump(data, { indent: 2, lineWidth: -1, noRefs: true, sortKeys: false })
}

function parseStructured(text, format) {
  try {
    const data = format === 'json' ? JSON.parse(text) : yamlLoad(text)
    return { data, error: '' }
  } catch (e) {
    return { data: null, error: String(e.message || '解析失败').split('\n')[0] }
  }
}

/**
 * from / to 取 'env' | 'json' | 'yaml'。
 * 返回 { text, error, warnings };输入为空时输出也为空。
 */
export function convertEnvSource(text, from, to, options = {}) {
  const src = String(text ?? '')
  if (!src.trim()) return { text: '', error: '', warnings: [] }
  if (!['env', 'json', 'yaml'].includes(from) || !['env', 'json', 'yaml'].includes(to)) {
    return { text: '', error: '不支持的转换格式', warnings: [] }
  }

  let parsed
  let warnings = []
  if (from === 'env') {
    const r = parseEnv(src)
    parsed = r.data
    warnings = r.warnings
  } else {
    const r = parseStructured(src, from)
    if (r.error) return { text: '', error: r.error, warnings: [] }
    parsed = r.data
  }

  const flat = normalizeFlatData(parsed)
  if (flat.error) return { text: '', error: flat.error, warnings }
  warnings = warnings.concat(flat.warnings)

  const output = to === 'env' ? stringifyEnv(flat.data, options) : serializeStructured(flat.data, to)
  return { text: output, error: '', warnings }
}