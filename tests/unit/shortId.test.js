import { describe, expect, it } from 'vitest'
import { nanoId, ulid, ulidTime } from '@/utils/shortId'

const ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/

describe('shortId · NanoID', () => {
  it('默认 21 字符,指定长度生效', () => {
    expect(nanoId()).toHaveLength(21)
    expect(nanoId(10)).toHaveLength(10)
    expect(nanoId(64)).toHaveLength(64)
  })

  it('只含 NanoID 字母表字符且随机不重复', () => {
    const ALPHA = /^[A-Za-z0-9_-]+$/
    const ids = new Set()
    for (let i = 0; i < 200; i++) {
      const id = nanoId()
      expect(id).toMatch(ALPHA)
      ids.add(id)
    }
    expect(ids.size).toBe(200)
  })
})

describe('shortId · ULID', () => {
  it('格式:26 位大写 Crockford Base32,不含 I L O U', () => {
    for (let i = 0; i < 100; i++) expect(ulid()).toMatch(ULID_RE)
  })

  it('时间戳部分可解析回毫秒', () => {
    const t = 1728123456789
    expect(ulidTime(ulid(t))).toBe(t)
    expect(ulidTime(ulid(0))).toBe(0)
  })

  it('同一毫秒生成的 ID 时间戳前缀一致且互不重复', () => {
    const t = 1728123456789
    const ids = Array.from({ length: 50 }, () => ulid(t))
    const prefixes = new Set(ids.map((id) => id.slice(0, 10)))
    expect(prefixes.size).toBe(1)
    expect(new Set(ids).size).toBe(50)
  })

  it('时间戳字符随时间增长(可按字典序排序)', () => {
    const early = ulid(1000)
    const late = ulid(Date.now())
    expect(late > early).toBe(true)
  })

  it('非法输入抛错,非法字符串解析返回 null', () => {
    expect(() => ulid(-1)).toThrow()
    expect(() => ulid(1.5)).toThrow()
    expect(ulidTime('not-a-ulid!!')).toBe(null)
    expect(ulidTime('O1FFFFFFFFFFFFFFFFFFFFFF')).toBe(null) // O 不在字母表
  })
})
