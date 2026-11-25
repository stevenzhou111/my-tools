import DOMPurify from 'dompurify'
import { htmlToMarkdown } from './htmlMd'

// mammoth 输出的 HTML 里可能带 javascript: 链接,转换前统一清洗
export function sanitizeWordHtml(html) {
  return DOMPurify.sanitize(String(html ?? ''), { ADD_ATTR: ['align'] })
}

const DATA_IMAGE = /!\[([^\]]*)\]\(data:image\/[^)]+\)/g

export function countDataImages(md) {
  return (String(md ?? '').match(DATA_IMAGE) || []).length
}

export function stripDataImages(md) {
  return String(md ?? '').replace(DATA_IMAGE, (_, alt) => `![${alt || '图片'}](图片已移除)`)
}

export function tidyMarkdown(md) {
  return String(md ?? '')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * docx 经 mammoth 转出的 HTML → Markdown。
 * keepImages 为 false 时不把 base64 图片写进 Markdown,避免文件膨胀。
 */
export function docxHtmlToMarkdown(html, { keepImages = true } = {}) {
  const safe = sanitizeWordHtml(html)
  const { md, error } = htmlToMarkdown(safe)
  if (error) return { md: '', error, images: 0 }
  const images = countDataImages(md)
  return {
    md: tidyMarkdown(keepImages ? md : stripDataImages(md)),
    error: '',
    images,
  }
}