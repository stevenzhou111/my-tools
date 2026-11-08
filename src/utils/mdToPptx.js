/**
 * Markdown → PPT 幻灯片数据结构(纯逻辑,供组件喂给 pptxgenjs):
 * - "===" 独占一行 强制分页;每段内首个标题(# ~ ###)作该页标题
 * - "- " 列表项转圆点;数字列表保留序号;代码围栏整块作为等宽文本
 * - 行内 **粗** *斜* `码` [文](链) 剥离标记只留文字,图片输出占位说明
 */

/** 把 Markdown 拆成幻灯片数组:[{ title, items: [{ text, bullet }] }] */
export function markdownToSlides(md) {
  const chunks = String(md ?? '')
    .replace(/\r\n?/g, '\n')
    .split(/\n={3,}\n/) // === 独占一行强制分页
    .map((c) => c.trim())
    .filter(Boolean)

  const slides = []
  for (const chunk of chunks) {
    const lines = chunk.split('\n')
    let title = ''
    const items = []
    let inCode = false
    for (const raw of lines) {
      const line = raw.replace(/\s+$/, '')
      if (/^```/.test(line.trim())) { inCode = !inCode; continue }
      const text = inlineToText(line)
      if (!inCode && !title && /^#{1,3}\s+/.test(line.trim())) {
        title = text
        continue
      }
      if (!text.trim()) continue
      if (inCode || /^(\s{4,}|\t)/.test(raw)) {
        items.push({ text, bullet: false, mono: true })
        continue
      }
      const bullet = /^[-*+]\s+/.test(line.trim()) || /^\d+[.)]\s+/.test(line.trim())
      items.push({ text: bullet ? text.replace(/^([-*+]|\d+[.)])\s+/, '') : text, bullet, mono: false })
    }
    if (!title && items.length) title = items[0].text.slice(0, 24)
    if (title || items.length) slides.push({ title: title || '(无标题)', items })
  }
  return slides
}

/** 剥离行内 Markdown 标记,保留纯文本 */
export function inlineToText(line) {
  return String(line ?? '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1(图片)')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^#{1,6}\s+/, '')
}
