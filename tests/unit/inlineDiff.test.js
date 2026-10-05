import { describe, expect, it } from 'vitest'
import { decorateOps } from '@/utils/inlineDiff'

describe('inlineDiff · decorateOps', () => {
  it('配对行内标出相同与改动部分(LCS 最优对齐)', () => {
    const out = decorateOps([
      { t: '-', s: 'Hello world' },
      { t: '+', s: 'Hello brave world' },
    ])
    expect(out).toHaveLength(2)
    // 'world' 可以完整对上,所以删除行整体无改动,新增行只有 brave 是新增
    expect(out[0].segs).toEqual([{ op: 'same', text: 'Hello world' }])
    expect(out[1].segs).toEqual([
      { op: 'same', text: 'Hello ' },
      { op: 'add', text: 'brave ' },
      { op: 'same', text: 'world' },
    ])
  })

  it('相同行不附加 segs', () => {
    const out = decorateOps([{ t: ' ', s: 'unchanged' }])
    expect(out[0].segs).toBeUndefined()
  })

  it('部分相同的行只标出差异片段', () => {
    const out = decorateOps([
      { t: '-', s: 'only in old' },
      { t: '+', s: 'only in new' },
      { t: '+', s: 'extra new' },
    ])
    expect(out).toHaveLength(3)
    expect(out[0].segs.map((s) => s.op)).toEqual(['same', 'del'])
    expect(out[1].segs.map((s) => s.op)).toEqual(['same', 'add'])
    expect(out[2].segs).toBeUndefined()
  })

  it('多对连续块按顺序逐对交错输出(del/add 相邻)', () => {
    const out = decorateOps([
      { t: '-', s: 'aa1' },
      { t: '-', s: 'bb1' },
      { t: '+', s: 'aa2' },
      { t: '+', s: 'bb2' },
    ])
    expect(out.map((o) => o.t)).toEqual(['-', '+', '-', '+'])
    expect(out[0].segs.some((s) => s.op === 'del' && s.text === '1')).toBe(true)
    expect(out[1].segs.some((s) => s.op === 'add' && s.text === '2')).toBe(true)
    expect(out[2].segs.some((s) => s.op === 'del' && s.text === '1')).toBe(true)
    expect(out[3].segs.some((s) => s.op === 'add' && s.text === '2')).toBe(true)
  })

  it('中文与标点的行内差异', () => {
    const out = decorateOps([
      { t: '-', s: '支持 17 个工具' },
      { t: '+', s: '支持 49 个工具' },
    ])
    expect(out[0].segs).toEqual([
      { op: 'same', text: '支持 ' },
      { op: 'del', text: '17' },
      { op: 'same', text: ' 个工具' },
    ])
    expect(out[1].segs).toEqual([
      { op: 'same', text: '支持 ' },
      { op: 'add', text: '49' },
      { op: 'same', text: ' 个工具' },
    ])
  })

  it('超过 500 字符的行不做行内标注', () => {
    const longA = 'a'.repeat(600)
    const longB = 'a'.repeat(600) + 'x'
    const out = decorateOps([
      { t: '-', s: longA },
      { t: '+', s: longB },
    ])
    expect(out[0].segs).toHaveLength(1)
    expect(out[0].segs[0].text).toHaveLength(500)
  })

  it('不修改输入 ops', () => {
    const ops = [
      { t: '-', s: 'a' },
      { t: '+', s: 'b' },
    ]
    decorateOps(ops)
    expect(ops[0]).toEqual({ t: '-', s: 'a' })
  })
})
