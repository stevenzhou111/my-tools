import { describe, expect, it } from 'vitest'
import { lorem, loremParagraph, loremSentence } from '@/utils/lorem'

describe('lorem · 句与段', () => {
  it('句子首字母大写并以标点结尾', () => {
    for (let i = 0; i < 30; i++) {
      const s = loremSentence()
      expect(s[0]).toMatch(/[A-Z]/)
      expect(s).toMatch(/[,?!.]$/)
    }
  })

  it('段落由 3~6 句组成', () => {
    for (let i = 0; i < 10; i++) {
      const p = loremParagraph()
      const sentences = p.split(/(?<=[.?!]) /)
      expect(sentences.length).toBeGreaterThanOrEqual(3)
      expect(sentences.length).toBeLessThanOrEqual(6)
    }
  })
})

describe('lorem · lorem()', () => {
  it('段落数量可控', () => {
    expect(lorem({ count: 5 }).split('\n\n')).toHaveLength(5)
    expect(lorem({ count: 1 }).split('\n\n')).toHaveLength(1)
  })

  it('句子模式返回单行', () => {
    const out = lorem({ unit: 'sentences', count: 4 })
    expect(out).not.toContain('\n')
    expect(out.trim().split(/(?<=[.?!]) /).length).toBeGreaterThanOrEqual(4)
  })

  it('classicStart 带经典开头,可关闭', () => {
    expect(lorem({ count: 1, classicStart: true })).toMatch(/^Lorem ipsum dolor sit amet/)
    expect(lorem({ unit: 'sentences', count: 1, classicStart: true })).toMatch(/^Lorem ipsum dolor sit amet/)
    expect(lorem({ count: 1, classicStart: false })).not.toMatch(/^Lorem ipsum/)
  })

  it('html 模式用 <p> 包裹', () => {
    const out = lorem({ count: 3, html: true })
    expect(out.match(/<p>/g)).toHaveLength(3)
    expect(out).toMatch(/^<p>/)
  })

  it('数量被钳制在 1~50', () => {
    expect(lorem({ count: 999 }).split('\n\n')).toHaveLength(50)
    expect(lorem({ count: 0 }).split('\n\n')).toHaveLength(1)
    expect(lorem({ count: -3 }).split('\n\n')).toHaveLength(1)
  })
})
