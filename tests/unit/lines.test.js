import { describe, expect, it } from 'vitest'
import { numberLines, removeEmpty, sortLines, splitLines, trimLines, uniqueLines } from '@/utils/lines'

describe('lines · splitLines', () => {
  it('兼容 \\r\\n 与纯 \\r,末尾空行不算一行', () => {
    expect(splitLines('a\r\nb\nc')).toEqual(['a', 'b', 'c'])
    expect(splitLines('a\rb')).toEqual(['a', 'b'])
    expect(splitLines('a\n\n')).toEqual(['a'])
    expect(splitLines('')).toEqual([])
  })
})

describe('lines · sortLines', () => {
  it('字母序忽略大小写', () => {
    expect(sortLines(['banana', 'Apple', 'cherry'])).toEqual(['Apple', 'banana', 'cherry'])
  })

  it('字母序可反转', () => {
    expect(sortLines(['b', 'a', 'c'], 'alpha', true)).toEqual(['c', 'b', 'a'])
  })

  it('数字序按行首数值,非数字行排后面', () => {
    expect(sortLines(['10 只', '2 只', 'abc', '1 只'], 'numeric')).toEqual(['1 只', '2 只', '10 只', 'abc'])
  })

  it('长度排序,同长按字典序', () => {
    expect(sortLines(['ccc', 'a', 'bb', 'dd'])).toEqual(['a', 'bb', 'ccc', 'dd'])
  })

  it('随机打乱是原数组的排列', () => {
    const src = Array.from({ length: 30 }, (_, i) => `行-${i}`)
    const shuffled = sortLines(src, 'random')
    expect([...shuffled].sort()).toEqual([...src].sort())
    expect(shuffled).not.toBe(src)
  })

  it('不修改原数组', () => {
    const src = ['b', 'a']
    sortLines(src)
    expect(src).toEqual(['b', 'a'])
  })
})

describe('lines · 其他操作', () => {
  it('去重保留首次出现,忽略首尾空白', () => {
    expect(uniqueLines(['a', ' a ', 'b', 'a'])).toEqual(['a', 'b'])
  })

  it('加行号,可补零', () => {
    expect(numberLines(['x', 'y'], 1)).toEqual(['1. x', '2. y'])
    expect(numberLines(['x', 'y', 'z'], 5)).toEqual(['5. x', '6. y', '7. z'])
    expect(numberLines(['x', 'y'], 9, true)).toEqual(['09. x', '10. y'])
  })

  it('去空行与行首尾空白', () => {
    expect(removeEmpty(['a', '  ', 'b', ''])).toEqual(['a', 'b'])
    expect(trimLines([' x ', 'y'])).toEqual(['x', 'y'])
  })
})
