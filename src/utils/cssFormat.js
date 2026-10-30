/**
 * CSS 格式化:单遍字符扫描 tokenizer,再按目标形态输出。
 * 字符串、url(...) 内部按原子处理,分号/花括号/空格都不会误伤 data URI。
 */

function tokenize(css) {
  const s = String(css ?? '')
  const out = []
  let buf = ''
  const flush = () => {
    if (buf.trim()) out.push({ t: 'text', v: buf.trim() })
    buf = ''
  }
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (c === '/' && s[i + 1] === '*') {
      flush()
      const end = s.indexOf('*/', i + 2)
      const comment = end === -1 ? s.slice(i) : s.slice(i, end + 2)
      out.push({ t: 'comment', v: comment })
      i = end === -1 ? s.length : end + 1
      continue
    }
    if (c === '"' || c === "'") {
      let j = i + 1
      while (j < s.length && s[j] !== c) j += s[j] === '\\' ? 2 : 1
      buf += s.slice(i, Math.min(j + 1, s.length))
      i = j
      continue
    }
    if ((c === 'u' || c === 'U') && /^url\(/i.test(s.slice(i))) {
      const open = i + 4
      let j = open
      while (j < s.length && s[j] !== ')') j += s[j] === '\\' ? 2 : 1
      buf += s.slice(i, Math.min(j + 1, s.length))
      i = j
      continue
    }
    if (c === '{' || c === '}' || c === ';' || c === ':') {
      flush()
      out.push({ t: c })
      continue
    }
    buf += c
  }
  flush()
  return out
}

// 折叠块外空白:字符串/url 原样保留;逗号后空格去除
function collapse(chunk) {
  let out = ''
  let i = 0
  while (i < chunk.length) {
    const c = chunk[i]
    if (c === '"' || c === "'") {
      let j = i + 1
      while (j < chunk.length && chunk[j] !== c) j += chunk[j] === '\\' ? 2 : 1
      out += chunk.slice(i, Math.min(j + 1, chunk.length))
      i = j + 1
      continue
    }
    if ((c === 'u' || c === 'U') && /^url\(/i.test(chunk.slice(i))) {
      const open = i + 4
      let j = open
      while (j < chunk.length && chunk[j] !== ')') j += chunk[j] === '\\' ? 2 : 1
      out += chunk.slice(i, Math.min(j + 1, chunk.length))
      i = j + 1
      continue
    }
    if (/\s/.test(c)) {
      while (i < chunk.length && /\s/.test(chunk[i])) i++
      // 逗号前的空格一并吃掉(a , b → a,b)
      if (out && i < chunk.length && chunk[i] !== ',') out += ' '
      continue
    }
    if (c === ',') {
      out += ','
      i++
      while (i < chunk.length && /\s/.test(chunk[i])) i++
      continue
    }
    out += c
    i++
  }
  return out
}

/** 压缩:去注释、去多余空白;声明内冒号后不留空格 */
export function minifyCss(css) {
  let out = ''
  for (const tok of tokenize(css)) {
    if (tok.t === 'comment') continue
    if (tok.t === 'text') {
      const v = collapse(tok.v)
      // 顶层冒号(声明与伪类 alike)两侧不留空白
      const idx = v.search(/[^\\]:/)
      out += idx === -1 ? v : v.slice(0, idx + 1) + v.slice(idx + 1).replace(/^\s+/, '')
    } else if (tok.t === '{') {
      out += '{'
    } else if (tok.t === '}') {
      out = out.replace(/;$/, '') + '}'
    } else if (tok.t === ';') {
      out += ';'
    } else if (tok.t === ':') {
      out += ':'
    }
  }
  return out.replace(/;}/g, '}').trim()
}

/** 美化:保留注释,2 空格缩进,一条声明一行 */
export function beautifyCss(css) {
  const out = []
  let depth = 0
  let line = ''
  let colonInLine = false
  const pad = () => '  '.repeat(depth)
  const commit = () => {
    if (line.trim()) out.push(pad() + line.trim())
    line = ''
    colonInLine = false
  }

  for (const tok of tokenize(css)) {
    if (tok.t === 'comment') {
      commit()
      out.push(`${pad()}${tok.v}`)
      continue
    }
    if (tok.t === 'text') {
      const v = collapse(tok.v)
      if (colonInLine) line += (line.endsWith(':') ? ' ' : '') + v
      else {
        commit()
        line = v
      }
      continue
    }
    if (tok.t === ':') {
      line += ':'
      colonInLine = true
      continue
    }
    if (tok.t === '{') {
      line += ' {'
      commit()
      depth++
      continue
    }
    if (tok.t === ';') {
      commit()
      continue
    }
    if (tok.t === '}') {
      commit()
      depth = Math.max(0, depth - 1)
      out.push(pad() + '}')
      continue
    }
  }
  commit()
  return out.join('\n')
}
