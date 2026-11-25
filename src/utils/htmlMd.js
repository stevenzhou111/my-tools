/**
 * HTML → Markdown:基于 turndown,补了代码块围栏等常用规则。
 */
import TurndownService from 'turndown'

let service = null

function getService() {
  if (service) return service
  service = new TurndownService({
    headingStyle: 'atx', // # 风格标题
    codeBlockStyle: 'fenced', // ``` 围栏代码块
    bulletListMarker: '-',
    emDelimiter: '*',
  })
  // 内联 <code> 保留反引号;turndown 默认已处理
  // <hr> → ---
  service.addRule('hr', {
    filter: ['hr'],
    replacement: () => '\n\n---\n\n',
  })
  addTableRules(service)
  return service
}

function cell(content, node) {
  const index = Array.prototype.indexOf.call(node.parentNode.childNodes, node)
  return `${index === 0 ? '| ' : ' '}${content.trim().replace(/\n+/g, ' ')} |`
}

function isHeadingRow(tr) {
  const parent = tr.parentNode
  if (!parent) return false
  if (parent.nodeName === 'THEAD') return true
  return [...tr.childNodes].every((n) => n.nodeName === 'TH')
}

// turndown 默认把表格压成一行纯文本,这里补 GFM 管道表格
function addTableRules(turndown) {
  turndown.addRule('tableCell', {
    filter: ['th', 'td'],
    replacement: (content, node) => cell(content, node),
  })
  turndown.addRule('tableRow', {
    filter: 'tr',
    replacement: (content, node) => {
      if (!isHeadingRow(node)) return `\n${content}`
      const border = [...node.childNodes]
        .map((n) => {
          const align = (n.getAttribute?.('align') || '').toLowerCase()
          const mark = { left: ':--', right: '--:', center: ':-:' }[align] || '---'
          return cell(mark, n)
        })
        .join('')
      return `\n${content}\n${border}`
    },
  })
  turndown.addRule('table', {
    filter: 'table',
    replacement: (content) => {
      const lines = content
        .replace(/\n{2,}/g, '\n')
        .trim()
        .split('\n')
        .filter(Boolean)
      // Word/mammoth 的表头也是 <td>,没有 thead 时要补一行 GFM 分隔符
      if (lines.length && !lines.some((l) => /^\|\s*:?-{3}/.test(l))) {
        const cols = Math.max(1, (lines[0].match(/\|/g) || []).length - 1)
        lines.splice(1, 0, `| ${Array(cols).fill('---').join(' | ')} |`)
      }
      return `\n\n${lines.join('\n')}\n\n`
    },
  })
}

export function htmlToMarkdown(html) {
  const s = String(html ?? '').trim()
  if (!s) return { md: '', error: '' }
  try {
    return { md: getService().turndown(s).trim(), error: '' }
  } catch (e) {
    return { md: '', error: '转换失败:' + (e.message || e) }
  }
}