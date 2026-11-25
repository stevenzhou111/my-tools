import { describe, expect, it } from 'vitest'
import {
  countDataImages,
  docxHtmlToMarkdown,
  stripDataImages,
  tidyMarkdown,
} from '@/utils/wordToMd'

describe('wordToMd', () => {
  it('保留标题、列表与表格', () => {
    const { md, error, images } = docxHtmlToMarkdown(
      '<h1>会议</h1><ul><li>结论一</li></ul><table><tr><th>项</th><th>值</th></tr><tr><td>a</td><td>1</td></tr></table>',
    )
    expect(error).toBe('')
    expect(images).toBe(0)
    expect(md).toContain('# 会议')
    expect(md).toContain('-   结论一')
    expect(md).toContain('| 项 | 值 |')
    expect(md).toContain('| a | 1 |')
  })

  it('清洗 javascript: 链接', () => {
    const { md } = docxHtmlToMarkdown('<p><a href="javascript:alert(1)">点我</a></p>')
    expect(md).toContain('点我')
    expect(md).not.toContain('javascript:')
  })

  it('默认保留内嵌图片,可移除', () => {
    const html = '<p><img src="data:image/png;base64,iVBORw0KGgo=" alt="图"></p>'
    const kept = docxHtmlToMarkdown(html)
    expect(kept.images).toBe(1)
    expect(kept.md).toContain('data:image/png;base64')

    const removed = docxHtmlToMarkdown(html, { keepImages: false })
    expect(removed.images).toBe(1)
    expect(removed.md).not.toContain('base64')
    expect(removed.md).toContain('图片已移除')
  })

  it('统计与清理内嵌图片', () => {
    const md = '![a](data:image/png;base64,xx)\n![b](data:image/jpeg;base64,yy)'
    expect(countDataImages(md)).toBe(2)
    expect(stripDataImages(md)).toBe('![a](图片已移除)\n![b](图片已移除)')
  })

  it('压缩多余空行与行尾空白', () => {
    expect(tidyMarkdown('a  \n\n\n\nb\n')).toBe('a\n\nb')
  })

  it('空 HTML 返回空结果', () => {
    expect(docxHtmlToMarkdown('')).toEqual({ md: '', error: '', images: 0 })
  })
})
