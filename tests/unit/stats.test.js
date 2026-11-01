import { describe, expect, it } from 'vitest'
import { parseNumbers, describeStats } from '@/utils/stats'

describe('stats · parseNumbers', () => {
  it('多种分隔符混用', () => {
    expect(parseNumbers('1, 2\n3\t4 5，6、7;8')).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })

  it('负数与小数', () => {
    expect(parseNumbers('-1.5, 2.25')).toEqual([-1.5, 2.25])
  })

  it('非法片段被丢弃', () => {
    expect(parseNumbers('1, abc, 2')).toEqual([1, 2])
    expect(parseNumbers('')).toEqual([])
  })
})

describe('stats · describeStats', () => {
  // 经典教学数据集:均值 5,总体方差 4,样本方差 32/7
  const S = describeStats([2, 4, 4, 4, 5, 5, 7, 9])

  it('个数、总和、均值', () => {
    expect(S.count).toBe(8)
    expect(S.sum).toBe(40)
    expect(S.mean).toBe(5)
  })

  it('中位数与最值', () => {
    expect(S.median).toBe(4.5)
    expect(S.min).toBe(2)
    expect(S.max).toBe(9)
    expect(S.range).toBe(7)
  })

  it('两种口径的方差与标准差', () => {
    expect(S.popVariance).toBe(4)
    expect(S.popStd).toBe(2)
    expect(S.sampleVariance).toBeCloseTo(32 / 7, 5)
    expect(S.sampleStd).toBeCloseTo(Math.sqrt(32 / 7), 5)
  })

  it('四分位数(线性插值)', () => {
    // 排序 [2,4,4,4,5,5,7,9]:Q1 位置 1.75 → 4;Q3 位置 5.25 → 5.5
    expect(S.q1).toBe(4)
    expect(S.q3).toBe(5.5)
    expect(S.iqr).toBe(1.5)
  })

  it('奇数个取中位:单个数字', () => {
    const one = describeStats([42])
    expect(one.median).toBe(42)
    expect(one.mean).toBe(42)
    expect(one.sampleVariance).toBeNull() // n=1 无样本方差
    expect(one.popVariance).toBe(0)
  })

  it('空数组返回 null', () => {
    expect(describeStats([])).toBeNull()
    expect(describeStats(['a'])).toBeNull()
  })
})
