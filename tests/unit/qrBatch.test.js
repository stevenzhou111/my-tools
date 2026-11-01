import { describe, expect, it } from 'vitest'
import { parseBatchLines, safeName, fileNameFor } from '@/utils/qrBatch'

describe('qrBatch · parseBatchLines', () => {
  it('逐行解析,去空行去重', () => {
    const { items, skipped } = parseBatchLines('a.com\n\n  b.com  \na.com\n')
    expect(items.map((i) => i.text)).toEqual(['a.com', 'b.com'])
    expect(skipped).toBe(1)
  })

  it('「内容 | 文件名」取最后一个竖线分隔', () => {
    const { items } = parseBatchLines('https://x.com/a|入口一')
    expect(items[0].text).toBe('https://x.com/a')
    expect(items[0].name).toBe('入口一')
  })

  it('max 截断并计数 skipped', () => {
    const text = Array.from({ length: 105 }, (_, i) => `url-${i}`).join('\n')
    const { items, skipped } = parseBatchLines(text, { max: 100 })
    expect(items).toHaveLength(100)
    expect(skipped).toBe(5)
  })

  it('空文本返回空', () => {
    expect(parseBatchLines('  \n \n')).toEqual({ items: [], skipped: 0 })
  })
})

describe('qrBatch · 文件名', () => {
  it('safeName 清洗非法字符,保留中文', () => {
    expect(safeName('仓库 A/B:1号', 'x')).toBe('仓库-A-B-1号')
    expect(safeName('///', 'fallback')).toBe('fallback')
  })

  it('fileNameFor:三位序号 + 自定义名优先', () => {
    expect(fileNameFor({ text: 'https://a.com/xx', name: '入口' }, 0)).toBe('001-入口.png')
    expect(fileNameFor({ text: 'https://a.com/xx', name: '' }, 4)).toBe('005-https-a.com-xx.png')
  })
})
