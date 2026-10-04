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
  return service
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