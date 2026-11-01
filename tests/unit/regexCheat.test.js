import { describe, expect, it } from 'vitest'
import { REGEX_PATTERNS, REGEX_SYNTAX, verifyPattern } from '@/utils/regexCheat'

describe('regexCheat · 模式库自检(核心守卫)', () => {
  it('每条模式的全部正反例样本行为正确', () => {
    for (const p of REGEX_PATTERNS) {
      const r = verifyPattern(p)
      expect(r.pass, `${p.id}(${p.name}) 样本失败:${r.failedSample} (${r.kind})`).toBe(true)
    }
  })

  it('模式 id 唯一、正则可编译', () => {
    const ids = REGEX_PATTERNS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const p of REGEX_PATTERNS) expect(() => new RegExp(p.source, p.flags), p.id).not.toThrow()
  })

  it('每条模式都有正反例', () => {
    for (const p of REGEX_PATTERNS) {
      expect(p.valid.length, p.id).toBeGreaterThan(0)
      expect(p.invalid.length, p.id).toBeGreaterThan(0)
    }
  })

  it('flag 合法(避免书写错误)', () => {
    for (const p of REGEX_PATTERNS) expect(p.flags, p.id).toMatch(/^[gimsuy]*$/)
  })

  it('抽样核对关键行为', () => {
    const get = (id) => REGEX_PATTERNS.find((p) => p.id === id)
    // 手机号:第二位限 3-9
    expect(new RegExp(get('phone-cn').source).test('13812345678')).toBe(true)
    expect(new RegExp(get('phone-cn').source).test('12812345678')).toBe(false)
    // IPv4 拒绝 256
    expect(new RegExp(get('ipv4').source).test('256.0.0.1')).toBe(false)
    // 强密码环视:缺大写不行
    expect(new RegExp(get('strong-pwd').source).test('Password1')).toBe(true)
    expect(new RegExp(get('strong-pwd').source).test('password1')).toBe(false)
  })
})

describe('regexCheat · 语法速查', () => {
  it('分组齐全且 token 非空', () => {
    const ids = REGEX_SYNTAX.map((g) => g.id)
    for (const id of ['char', 'quant', 'anchor', 'group', 'look', 'flags']) {
      expect(ids, id).toContain(id)
    }
    for (const g of REGEX_SYNTAX) {
      expect(g.items.length, g.id).toBeGreaterThan(0)
      for (const it of g.items) expect(it.token.length).toBeGreaterThan(0)
    }
  })

  it('关键语法都在:环视、命名分组、懒惰量词', () => {
    const all = REGEX_SYNTAX.flatMap((g) => g.items.map((i) => i.token))
    expect(all).toContain('(?=abc)')
    expect(all).toContain('(?<name>abc)')
    // 懒惰量词在 '?' 条目的描述里说明(*?、+?)
    expect(REGEX_SYNTAX.find((g) => g.id === 'quant').items.some((i) => i.desc.includes('懒惰'))).toBe(true)
  })
})
