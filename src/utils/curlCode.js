/**
 * curl 命令 → fetch / Python requests 代码生成。
 * 支持 URL、-X、-H、-d/--data*、--form/-F、-u 基本认证、--get;
 * 未识别的旗标不会静默丢弃,而是列出来提醒手动处理(与 docker run→compose 同策略)。
 */

/** 按引号规则切分命令行(处理单双引号与转义),并先合并行尾反斜杠续行 */
export function tokenize(input) {
  const s = String(input ?? '').replace(/\\\r?\n/g, ' ')
  const tokens = []
  let cur = ''
  let has = false
  let i = 0
  while (i < s.length) {
    const ch = s[i]
    if (ch === ' ' || ch === '\t') {
      if (has) tokens.push(cur)
      cur = ''
      has = false
      i++
      continue
    }
    if (ch === "'" || ch === '"') {
      const quote = ch
      i++
      while (i < s.length && s[i] !== quote) {
        if (quote === '"' && s[i] === '\\' && i + 1 < s.length) {
          cur += s[i + 1]
          i += 2
        } else {
          cur += s[i]
          i++
        }
      }
      i++ // 跳过结束引号
      has = true
      continue
    }
    cur += ch
    has = true
    i++
  }
  if (has) tokens.push(cur)
  return tokens
}

const KNOWN_FLAGS = new Set(['-X', '--request', '-H', '--header', '-d', '--data', '--data-raw', '--data-ascii', '--data-binary', '--data-urlencode', '-F', '--form', '-u', '--user', '--get', '-G', '--url'])

// 常见的「带一个值」的旗标:未识别但出现在这里时,把下一个 token 当作它的值消费掉,
// 避免值(如 --retry 3 的 3)被误认成 URL。不在表内的按无值旗标处理。
const VALUE_FLAGS = new Set(['-o', '--output', '--retry', '--retry-delay', '-m', '--max-time', '--connect-timeout', '-A', '--user-agent', '-e', '--referer', '-x', '--proxy', '--noproxy', '--cacert', '--capath', '--cert', '--key', '--limit-rate', '-T', '--upload-file', '--resolve', '--cookie', '-b', '--cookie-jar', '--dump-header', '--interface', '--trace', '--trace-ascii'])

/**
 * @param {string} cmd curl 命令(可多行、可带 $ 转义的 shell 风格)
 * @returns {{ ok:boolean, error?:string, url?:string, method?:string, headers?:{name,value}[],
 *   body?:string, form?:{name,value,file:boolean}[], auth?:string, unknown?:string[] }}
 */
export function parseCurl(cmd) {
  let tokens = tokenize(String(cmd ?? '').replace(/\$'/g, "'"))
  if (tokens[0]?.toLowerCase() === 'curl') tokens = tokens.slice(1)
  const out = { ok: true, headers: [], form: [], unknown: [] }
  let bodyParts = []
  let authPair = null
  let i = 0
  while (i < tokens.length) {
    const t = tokens[i]
    if (t === '-X' || t === '--request') {
      out.method = (tokens[++i] ?? '').toUpperCase()
      if (!out.method) return { ok: false, error: '-X 后缺少方法名' }
    } else if (t === '-H' || t === '--header') {
      const raw = tokens[++i]
      if (!raw) return { ok: false, error: '-H 后缺少头' }
      const idx = raw.indexOf(':')
      if (idx === -1) return { ok: false, error: `请求头 "${raw}" 缺少冒号` }
      const name = raw.slice(0, idx).trim()
      const value = raw.slice(idx + 1).trim()
      if (out.headers.some((h) => h.name.toLowerCase() === name.toLowerCase())) return { ok: false, error: `请求头 ${name} 重复出现` }
      out.headers.push({ name, value })
    } else if (t === '-d' || t === '--data' || t === '--data-raw' || t === '--data-ascii' || t === '--data-binary') {
      bodyParts.push(tokens[++i] ?? '')
    } else if (t === '--data-urlencode') {
      bodyParts.push(tokens[++i] ?? '')
      out.hasUrlEncode = true
    } else if (t === '-F' || t === '--form') {
      const raw = tokens[++i]
      if (!raw || !raw.includes('=')) return { ok: false, error: `表单字段 "${raw}" 缺少 =` }
      const name = raw.slice(0, raw.indexOf('='))
      const value = raw.slice(raw.indexOf('=') + 1)
      out.form.push({ name, value, file: value.startsWith('@') })
    } else if (t === '-u' || t === '--user') {
      authPair = tokens[++i] ?? ''
    } else if (t === '--get' || t === '-G') {
      out.isGet = true
    } else if (t === '--url') {
      out.url = tokens[++i]
    } else if (t.startsWith('-')) {
      out.unknown.push(t)
      // 带值旗标把参数消费掉,防止值被误认为 URL
      if (VALUE_FLAGS.has(t) && tokens[i + 1] !== undefined && !tokens[i + 1].startsWith('-')) i++
    } else if (!out.url) {
      out.url = t
    } else {
      out.unknown.push(t)
    }
    i++
  }
  if (!out.url) return { ok: false, error: '没有找到请求 URL' }

  out.body = bodyParts.join('&')
  if (authPair) {
    if (!authPair.includes(':')) return { ok: false, error: '-u 的用户名密码要用冒号分隔' }
    // 浏览器环境 btoa;测试环境退化到 Buffer
    const encode = typeof btoa === 'function' ? btoa : (s) => Buffer.from(s, 'binary').toString('base64')
    out.auth = `Basic ${encode(authPair)}`
    if (!out.headers.some((h) => h.name.toLowerCase() === 'authorization')) {
      out.headers.push({ name: 'Authorization', value: out.auth })
    }
  }
  // GET 语义(--get/-G):把 -d 数据拼到查询串
  if (out.isGet && out.body) {
    const sep = out.url.includes('?') ? '&' : '?'
    out.url += sep + out.body
    out.body = ''
  }
  // JSON 体且未显式声明 Content-Type 时自动补
  if (out.body && !out.form.length && !out.hasUrlEncode) {
    const hasCT = out.headers.some((h) => h.name.toLowerCase() === 'content-type')
    if (!hasCT && /^[[{"]/.test(out.body.trim())) {
      out.headers.push({ name: 'Content-Type', value: 'application/json' })
    }
  }
  if (!out.method) out.method = out.form.length ? 'POST' : out.body ? 'POST' : 'GET'
  return out
}

function jsString(s) {
  return "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'"
}

/** 生成 fetch 代码 */
export function toFetchCode(p) {
  const lines = []
  const headers = p.headers.map((h) => `    ${jsString(h.name)}: ${jsString(h.value)},`).join('\n')
  const hasHeaders = p.headers.length > 0
  lines.push(`const res = await fetch(${jsString(p.url)}, {`)
  if (p.method !== 'GET' || hasHeaders || p.body || p.form.length) {
    lines.push(`  method: ${jsString(p.method)},`)
  }
  if (hasHeaders) lines.push('  headers: {\n' + headers + '\n  },')
  if (p.form.length) {
    lines.push('  body: (() => {')
    lines.push('    const fd = new FormData()')
    for (const f of p.form) {
      if (f.file) lines.push(`    fd.append(${jsString(f.name)}, fileInput.files[0]) // 原 curl 从文件读取:${f.value}`)
      else lines.push(`    fd.append(${jsString(f.name)}, ${jsString(f.value)})`)
    }
    lines.push('    return fd')
    lines.push('  })(),')
  } else if (p.body) {
    lines.push(`  body: ${jsString(p.body)},`)
  }
  lines.push('})')
  lines.push('console.log(res.status, await res.text())')
  return lines.join('\n')
}

function pyString(s) {
  return "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'"
}

/** 生成 Python requests 代码 */
export function toPythonCode(p) {
  const lines = ['import requests', '']
  const method = p.method.toLowerCase()
  const args = []
  if (p.headers.length) {
    lines.push('headers = {')
    for (const h of p.headers) lines.push(`    ${pyString(h.name)}: ${pyString(h.value)},`)
    lines.push('}')
    args.push('headers=headers')
  }
  if (p.form.length) {
    lines.push('files = {')
    for (const f of p.form) {
      if (f.file) lines.push(`    ${pyString(f.name)}: open(${pyString(f.value.slice(1))}, 'rb'),`)
      else lines.push(`    ${pyString(f.name)}: (None, ${pyString(f.value)}),`)
    }
    lines.push('}')
    args.push('files=files')
  } else if (p.body) {
    lines.push(`data = ${pyString(p.body)}`)
    args.push('data=data')
  }
  lines.push(`res = requests.${method}(${pyString(p.url)}${args.length ? ', ' + args.join(', ') : ''})`)
  lines.push('print(res.status_code, res.text)')
  return lines.join('\n')
}
