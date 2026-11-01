import { describe, expect, it } from 'vitest'
import { caesar, atbash, vigenere, caesarAllShifts, letterFreq } from '@/utils/classicCipher'

describe('cipher · 凯撒', () => {
  it('加密与解密互逆', () => {
    expect(caesar('ABC XYZ', 3)).toBe('DEF ABC')
    expect(caesar('DEF ABC', -3)).toBe('ABC XYZ')
    expect(caesar(caesar('Hello, World!', 7), -7)).toBe('Hello, World!')
  })

  it('绕回:Z + 1 → A;位移取模', () => {
    expect(caesar('Z', 1)).toBe('A')
    expect(caesar('A', 29)).toBe(caesar('A', 3))
  })

  it('非字母原样保留', () => {
    expect(caesar('中文 123 !@#', 5)).toBe('中文 123 !@#')
    expect(caesar('Abc-123-Xyz', 2)).toBe('Cde-123-Zab')
  })

  it('ROT13 自反', () => {
    expect(caesar(caesar('ATTACK AT DAWN', 13), 13)).toBe('ATTACK AT DAWN')
  })
})

describe('cipher · Atbash', () => {
  it('镜像且自反', () => {
    expect(atbash('ABC')).toBe('ZYX')
    expect(atbash(atbash('Hello'))).toBe('Hello')
    expect(atbash('AZ')).toBe('ZA')
  })

  it('非字母原样保留', () => {
    expect(atbash('密文 123')).toBe('密文 123')
  })
})

describe('cipher · 维吉尼亚', () => {
  it('经典例:ATTACKATDAWN + KEY=LEMON → LXFOPVEFRNHR', () => {
    expect(vigenere('ATTACKATDAWN', 'LEMON')).toBe('LXFOPVEFRNHR')
    expect(vigenere('LXFOPVEFRNHR', 'LEMON', -1)).toBe('ATTACKATDAWN')
  })

  it('密钥中的非字母被忽略,循环使用', () => {
    expect(vigenere('AAAA', 'A,B,C')).toBe('ABCA') // 密钥视作 ABC 循环
  })

  it('空密钥抛错', () => {
    expect(() => vigenere('ABC', '123')).toThrow('密钥')
    expect(() => vigenere('ABC', '')).toThrow()
  })

  it('小写输入保留小写且运算正确', () => {
    expect(vigenere('attackatdawn', 'lemon')).toBe('lxfopvefrnhr')
  })
})

describe('cipher · 破解辅助', () => {
  it('26 种位移齐全且包含原始文本(k=0)', () => {
    const all = caesarAllShifts('DEF')
    expect(all).toHaveLength(26)
    expect(all.find((s) => s.shift === 23).text).toBe('ABC')
  })

  it('频次统计降序', () => {
    const f = letterFreq('aabbb cc')
    expect(f[0]).toEqual({ ch: 'B', n: 3 })
    expect(f.map((x) => x.ch)).toContain('A')
  })
})
