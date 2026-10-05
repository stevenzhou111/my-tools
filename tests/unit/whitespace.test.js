import { describe, expect, it } from 'vitest'
import { convertLineEndings, countZeroWidth, detectLineEndings, revealInvisible, stripZeroWidth } from '@/utils/whitespace'

describe('whitespace · 换行符', () => {
  it('统计 CRLF 与裸 LF 并判定主导者', () => {
    expect(detectLineEndings('a\r\nb\r\nc')).toEqual({ crlf: 2, lf: 0, dominant: 'crlf' })
    expect(detectLineEndings('a\nb\r\nc\nd')).toEqual({ crlf: 1, lf: 2, dominant: 'lf' })
    expect(detectLineEndings('单行').dominant).toBe(null)
  })

  it('统一为 LF / CRLF,吞掉孤立 CR', () => {
    expect(convertLineEndings('a\r\nb\rc\nd', 'lf')).toBe('a\nb\nc\nd')
    expect(convertLineEndings('a\nb\r\nc', 'crlf')).toBe('a\r\nb\r\nc')
  })
})

describe('whitespace · 零宽字符', () => {
  const dirty = 'a\u200bb\u200cc\u200dd\ufeffe\u2060f'

  it('逐类统计', () => {
    const counts = countZeroWidth(dirty)
    expect(counts.map((c) => c.count)).toEqual([1, 1, 1, 1, 1])
    expect(countZeroWidth('干净文本')).toEqual([])
  })

  it('清除全部零宽字符', () => {
    expect(stripZeroWidth(dirty)).toBe('abcdef')
    expect(countZeroWidth(stripZeroWidth(dirty))).toEqual([])
  })
})

describe('whitespace · 不可见字符可视化', () => {
  it('空格 / Tab / 换行 / NBSP / 零宽各就各位', () => {
    expect(revealInvisible('a b\tc\u00a0d\u200be')).toBe('a·b⇥c⍽d⟦zw⟧e')
  })

  it('行尾显示 ␊ 并保留真实换行便于阅读', () => {
    expect(revealInvisible('x\ny')).toBe('x␊\ny')
    expect(revealInvisible('x\r\ny').startsWith('x␊\n')).toBe(true)
  })

  it('全角空格标记为 ␠', () => {
    expect(revealInvisible('你\u3000好')).toBe('你␠好')
  })
})
