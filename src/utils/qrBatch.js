/**
 * 二维码批量生成:行级解析与文件名清洗(纯函数,便于测试)。
 */

/**
 * 把多行文本解析为待生成列表:去空行、去重、限量。
 * 支持「内容 | 文件名」的竖线写法,省略时自动从内容生成。
 * @param {string} text
 * @param {{max?:number}} o
 * @returns {{items:{text:string, name:string}[], skipped:number}}
 */
export function parseBatchLines(text, { max = 100 } = {}) {
  const seen = new Set()
  const items = []
  let skipped = 0
  for (const raw of String(text || '').split('\n')) {
    const line = raw.trim()
    if (!line) continue
    if (items.length >= max) {
      skipped++
      continue
    }
    const bar = line.lastIndexOf('|')
    let content = line
    let customName = ''
    if (bar > 0 && bar < line.length - 1) {
      content = line.slice(0, bar).trim()
      customName = line.slice(bar + 1).trim()
    }
    if (!content || seen.has(content)) {
      skipped++
      continue
    }
    seen.add(content)
    items.push({ text: content, name: customName })
  }
  return { items, skipped }
}

/** 清洗文件名:去非法字符与前后缀空白,保留中文 */
export function safeName(name, fallback) {
  const cleaned = String(name || '')
    .replace(/[\\/:*?"<>|\s]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return cleaned || fallback
}

/** 第 idx 条的文件名:序号 + 自定义名或内容摘要 */
export function fileNameFor(item, idx) {
  const n = String(idx + 1).padStart(3, '0')
  return `${n}-${safeName(item.name, safeName(item.text, 'qrcode'))}.png`
}
