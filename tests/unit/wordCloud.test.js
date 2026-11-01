import { describe, expect, it } from 'vitest'
import { tokenize, layoutCloud } from '@/utils/wordCloud'

describe('wordCloud · tokenize', () => {
  it('英文按单词统计并小写归一', () => {
    const { items, total } = tokenize('Vue Vue vue and React Vue', { mode: 'word' })
    expect(items[0]).toEqual({ text: 'vue', count: 4 })
    expect(items.map((i) => i.text)).toContain('react')
    // and 被停用词滤除
    expect(items.map((i) => i.text)).not.toContain('and')
    expect(total).toBe(5)
  })

  it('中文按单字统计', () => {
    const { items } = tokenize('工具箱里的工具', { mode: 'char' })
    // 注意:「工具」出现两次,工 与 具 的频次都是 2;断言按字查找,不依赖平局时的排序
    expect(items.find((i) => i.text === '工')?.count).toBe(2)
    expect(items.find((i) => i.text === '具')?.count).toBe(2)
    expect(items.find((i) => i.text === '箱')?.count).toBe(1)
    expect(items).toHaveLength(5)
  })

  it('自定义停用词生效', () => {
    const { items } = tokenize('apple banana apple banana cherry', { mode: 'word', stopwords: ['banana'] })
    expect(items.map((i) => i.text)).toEqual(['apple', 'cherry'])
  })

  it('按频次降序,同频按字典序', () => {
    const { items } = tokenize('bb bb aa aa aa cc', { mode: 'word' })
    expect(items.map((i) => i.text)).toEqual(['aa', 'bb', 'cc'])
    expect(items.map((i) => i.count)).toEqual([3, 2, 1])
  })

  it('max 截断只保留前 N 名', () => {
    const { items } = tokenize('aaa aaa aaa bbb bbb ccc', { mode: 'word', max: 2 })
    expect(items).toHaveLength(2)
  })

  it('空文本返回空结果', () => {
    expect(tokenize('  \n  ').items).toEqual([])
  })
})

describe('wordCloud · layoutCloud', () => {
  const sample = tokenize('云 云 云 词 词 词 词 图 图 生成 生成 生成 本地 本地 频次 高', { mode: 'word' })

  it('高频词字号更大', () => {
    const { placed } = layoutCloud(sample, { width: 600, height: 400 })
    const big = placed.find((p) => p.text === '词')
    const small = placed.find((p) => p.text === '高')
    expect(big.size).toBeGreaterThan(small.size)
  })

  it('词不重叠且都在画布内', () => {
    const { placed } = layoutCloud(sample, { width: 600, height: 400 })
    for (const p of placed) {
      expect(p.x - p.w / 2).toBeGreaterThanOrEqual(0)
      expect(p.y - p.h / 2).toBeGreaterThanOrEqual(0)
      expect(p.x + p.w / 2).toBeLessThanOrEqual(600)
      expect(p.y + p.h / 2).toBeLessThanOrEqual(400)
    }
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const a = placed[i]
        const b = placed[j]
        const overlap = a.x - a.w / 2 < b.x + b.w / 2 && b.x - b.w / 2 < a.x + a.w / 2 && a.y - a.h / 2 < b.y + b.h / 2 && b.y - b.h / 2 < a.y + a.h / 2
        expect(overlap, `"${a.text}" 与 "${b.text}" 重叠`).toBe(false)
      }
    }
  })

  it('同一输入布局完全一致(可复现)', () => {
    const l1 = layoutCloud(sample, { width: 600, height: 400 })
    const l2 = layoutCloud(sample, { width: 600, height: 400 })
    expect(l1).toEqual(l2)
  })

  it('画布过小时跳过放不下的词并如实计数', () => {
    const { placed, skipped } = layoutCloud(sample, { width: 80, height: 60, maxFont: 40 })
    expect(skipped).toBeGreaterThan(0)
    expect(placed.length + skipped).toBe(sample.items.length)
  })

  it('空输入返回空布局', () => {
    expect(layoutCloud({ items: [] }, { width: 600, height: 400 })).toEqual({ placed: [], skipped: 0 })
  })
})
