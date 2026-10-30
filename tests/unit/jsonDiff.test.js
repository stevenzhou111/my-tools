import { describe, expect, it } from 'vitest'
import { diffJson, renderDiff } from '@/utils/jsonDiff'

describe('jsonDiff · 结构化对比', () => {
  it('新增 / 删除 / 变更与路径表示', () => {
    const { entries } = diffJson(
      { a: 1, b: { c: 2, d: 3 }, list: [1, 2, 3] },
      { a: 1, b: { c: 5 }, list: [1, 2, 3, 4], e: 'x' },
    )
    const byPath = Object.fromEntries(entries.map((e) => [e.path, e]))
    expect(byPath['b.c'].type).toBe('change')
    expect(byPath['b.c'].old).toBe('2')
    expect(byPath['b.c'].new).toBe('5')
    expect(byPath['b.d'].type).toBe('remove')
    expect(byPath['list[3]'].type).toBe('add')
    expect(byPath['e'].type).toBe('add')
    expect(entries).toHaveLength(4)
  })

  it('类型不同按整体变更,不下钻(1 与 "1" 也算变更)', () => {
    const { entries } = diffJson({ v: 1 }, { v: '1' })
    expect(entries[0].type).toBe('change')
    expect(entries[0].old).toBe('1')
    expect(entries[0].new).toBe('"1"')

    const r2 = diffJson({ v: [1] }, { v: { 0: 1 } })
    expect(r2.entries[0].type).toBe('change')
    expect(r2.entries).toHaveLength(1)
  })

  it('字符串带引号区分于数字,null 与嵌套数组', () => {
    const { entries } = diffJson({ s: 'a"b', n: [[1, 2]] }, { s: 'a"b', n: [[1, 3]] })
    expect(entries).toHaveLength(1)
    expect(entries[0].path).toBe('n[0][1]')
  })

  it('完全一致返回空,total 与截断', () => {
    expect(diffJson({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] }).entries).toHaveLength(0)
    const big = Object.fromEntries(Array.from({ length: 600 }, (_, i) => [`k${i}`, i]))
    const r = diffJson(big, {})
    expect(r.total).toBe(600)
    expect(r.entries).toHaveLength(500)
    expect(r.truncated).toBe(true)
  })

  it('renderDiff 带符号与说明', () => {
    const text = renderDiff(diffJson({ a: 1 }, { a: 2, b: 3 }).entries)
    expect(text).toContain('~ a: 1 → 2')
    expect(text).toContain('+ b = 3(新增)')
  })
})
