/**
 * 轻量代码高亮:单遍正则扫描,输出 { text, cls } 片段流。
 * 覆盖 JS/TS/JSON/Python/HTML/CSS 等常见语法的「近似」高亮——用于生成分享图,
 * 不追求编辑器级精确。渲染端 Canvas 按顺序拼接片段即可。
 */

const TOKEN_RE =
  /(\/\/[^\n]*|#[^\n!][^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b(0x[\da-fA-F]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b|\b(const|let|var|function|return|if|else|for|while|break|continue|new|class|extends|import|export|from|default|async|await|try|catch|finally|throw|typeof|instanceof|this|null|undefined|true|false|def|elif|lambda|pass|None|True|False|self|print)\b|\b(console|Math|JSON|Object|Array|String|Number|Date|Promise|document|window|setTimeout|clearTimeout|setInterval)\b/g

const CLASSES = ['comment', 'string', 'number', 'keyword', 'builtin']

/** 单行 → [{ text, cls }]。cls 为空表示普通文本。 */
export function highlight(line) {
  const out = []
  let last = 0
  for (const m of String(line ?? '').matchAll(TOKEN_RE)) {
    const idx = m.index
    if (idx > last) out.push({ text: line.slice(last, idx), cls: '' })
    const cls = CLASSES.find((_, i) => m[i + 1] !== undefined) ?? ''
    out.push({ text: m[0], cls })
    last = idx + m[0].length
  }
  if (last < line.length) out.push({ text: line.slice(last), cls: '' })
  return out
}
