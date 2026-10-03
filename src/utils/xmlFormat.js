/**
 * XML 格式化 / 压缩:基于浏览器原生 DOMParser + 手写序列化。
 * 不引第三方库:jsdom(DOMParser 可用)下可单测,压缩后 Chunk 只有几 KB。
 */

function escapeText(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '>')
}

function escapeAttr(s) {
  return escapeText(s).replace(/"/g, '&quot;')
}

function parse(xml) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  const err = doc.querySelector('parsererror')
  if (err) {
    // Chrome/Firefox 的报错文案不同,取第一行有效信息
    const firstLine = (err.textContent || '').split('\n').find((l) => l.trim() && !/This page contains/i.test(l))
    throw new Error(firstLine?.trim() || 'XML 解析失败')
  }
  return doc
}

function singleTextChild(node) {
  // 仅当唯一子节点是文本或 CDATA 时才内联成单行;
  // 文本+注释混排等情况展开,避免静默丢内容
  if (node.childNodes.length !== 1) return null
  const c = node.childNodes[0]
  return c.nodeType === 3 || c.nodeType === 4 ? c : null
}

function serializeNode(node, indent, depth, out) {
  const pad = indent.repeat(depth)
  switch (node.nodeType) {
    case 1: {
      const attrs = [...node.attributes].map((a) => ` ${a.name}="${escapeAttr(a.value)}"`).join('')
      const only = singleTextChild(node)
      if (only) {
        const text = only.nodeType === 4 ? `<![CDATA[${only.data}]]>` : escapeText(only.textContent)
        out.push(`${pad}<${node.tagName}${attrs}>${text}</${node.tagName}>\n`)
        return
      }
      if (!node.childNodes.length) {
        out.push(`${pad}<${node.tagName}${attrs}/>\n`)
        return
      }
      out.push(`${pad}<${node.tagName}${attrs}>\n`)
      for (const c of node.childNodes) serializeNode(c, indent, depth + 1, out)
      out.push(`${pad}</${node.tagName}>\n`)
      return
    }
    case 3: // 顶层杂散文本:保留但去掉首尾空白
      if (node.textContent.trim()) out.push(`${pad}${escapeText(node.textContent.trim())}\n`)
      return
    case 4:
      out.push(`${pad}<![CDATA[${node.data}]]>\n`)
      return
    case 7:
      out.push(`${pad}<?${node.target}${node.data ? ' ' + node.data : ''}?>\n`)
      return
    case 8:
      out.push(`${pad}<!--${node.data}-->\n`)
      return
    default:
  }
}

function serializeDoc(doc, indent) {
  const out = []
  if (doc.childNodes[0]?.nodeType === 7) {
    // XML 声明或 PI 固定顶格
    const pi = doc.childNodes[0]
    out.push(`<?${pi.target}${pi.data ? ' ' + pi.data : ''}?>\n`)
    for (let i = 1; i < doc.childNodes.length; i++) serializeNode(doc.childNodes[i], indent, 0, out)
  } else {
    for (const c of doc.childNodes) serializeNode(c, indent, 0, out)
  }
  return out.join('')
}

function compactNode(node, out) {
  switch (node.nodeType) {
    case 1: {
      const attrs = [...node.attributes].map((a) => ` ${a.name}="${escapeAttr(a.value)}"`).join('')
      out.push(`<${node.tagName}${attrs}>`)
      for (const c of node.childNodes) compactNode(c, out)
      out.push(`</${node.tagName}>`)
      return
    }
    case 3: {
      // compact 场景:标签之间的纯缩进/换行空白节点直接丢弃;
      // 元素内部的非空文本(<b> 2 </b> 的 "  2 ")原样保留
      if (node.textContent.trim()) out.push(escapeText(node.textContent))
      return
    }
    case 4:
      out.push(`<![CDATA[${node.data}]]>`)
      return
    case 7:
      out.push(`<?${node.target}${node.data ? ' ' + node.data : ''}?>`)
      return
    case 8:
      out.push(`<!--${node.data}-->`)
      return
    default:
  }
}

function compactDoc(doc) {
  const out = []
  for (const c of doc.childNodes) compactNode(c, out)
  return out.join('')
}

function run(xml, fn, declSep = '\n') {
  const s = String(xml ?? '')
  if (!s.trim()) return { text: '', error: '' }
  try {
    let text = fn(parse(s))
    // jsdom 的 DOMParser 不保留 XML 声明(浏览器会输出为 PI 节点),统一以输入为准回补
    const decl = s.match(/^\s*<\?xml[^?]*\?>\s*/)
    if (decl && !/^\s*<\?xml/.test(text)) text = decl[0].trim() + (text ? declSep + text : '')
    return { text, error: '' }
  } catch (e) {
    return { text: '', error: e.message }
  }
}

/** pretty:indent 为缩进字符数 */
export function formatXml(xml, indent = 2) {
  return run(xml, (doc) => serializeDoc(doc, ' '.repeat(indent)).trimEnd())
}

/** compact:去除全部无意义空白(纯文本节点保留原文) */
export function compactXml(xml) {
  return run(xml, (doc) => compactDoc(doc).trim(), '')
}