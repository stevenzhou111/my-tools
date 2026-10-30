import { describe, expect, it } from 'vitest'
import { evalSci } from '@/utils/sciExpression'
import { groupNames, pickOne, shuffle, splitNames } from '@/utils/randomPicker'

// 固定种子的伪随机数,保证分组测试可复现
function mulberry32(seed) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('evalSci · 科学计算', () => {
  it('四则与幂(右结合)', () => {
    expect(evalSci('(1+2)*3').value).toBe(9)
    expect(evalSci('2^10').value).toBe(1024)
    expect(evalSci('2^3^2').value).toBe(512)
    expect(evalSci('-2^2').value).toBe(-4)
    expect(evalSci('1/0').value).toBe(null)
  })

  it('三角函数:角度制与弧度制', () => {
    expect(evalSci('sin(30)', { degrees: true }).value).toBeCloseTo(0.5, 9)
    expect(evalSci('cos(60)', { degrees: true }).value).toBeCloseTo(0.5, 9)
    expect(evalSci('tan(45)', { degrees: true }).value).toBeCloseTo(1, 9)
    expect(evalSci('asin(0.5)', { degrees: true }).value).toBeCloseTo(30, 9)
    // 弧度制:sin(π/2) = 1
    expect(evalSci('sin(pi/2)').value).toBe(1)
  })

  it('对数指数与取整函数', () => {
    expect(evalSci('ln(e)').value).toBe(1)
    expect(evalSci('log(100)').value).toBe(2)
    expect(evalSci('sqrt(2)').value).toBeCloseTo(Math.SQRT2, 9)
    expect(evalSci('exp(0)').value).toBe(1)
    expect(evalSci('round(3.6)').value).toBe(4)
    expect(evalSci('floor(-1.2)').value).toBe(-2)
    expect(evalSci('ceil(1.1)').value).toBe(2)
    expect(evalSci('abs(-5)').value).toBe(5)
  })

  it('常数与非法输入', () => {
    // 输出经 toPrecision(12) 消浮点噪声
    expect(evalSci('pi').value).toBeCloseTo(Math.PI, 11)
    expect(evalSci('2*pi').value).toBeCloseTo(Math.PI * 2, 9)
    // 大小写不敏感
    expect(evalSci('PI').value).toBeCloseTo(Math.PI, 11)
    expect(evalSci('foo(1)').value).toBe(null)
    expect(evalSci('sin 30').value).toBe(null)
    expect(evalSci('sqrt(-1)').value).toBe(null)
    expect(evalSci('(1+2').value).toBe(null)
    expect(evalSci('1+2=3').value).toBe(null)
  })
})

describe('randomPicker · 点名与分组', () => {
  it('splitNames:混合分隔符、去空与去重', () => {
    expect(splitNames('张三,李四、王五\n赵六;钱七\t孙八')).toEqual(['张三', '李四', '王五', '赵六', '钱七', '孙八'])
    expect(splitNames('张三, 张三 ,,  ')).toEqual(['张三'])
  })

  it('shuffle 保持元素集合不变', () => {
    const arr = [1, 2, 3, 4, 5]
    expect(shuffle(arr, mulberry32(42)).sort()).toEqual(arr)
    expect(arr).toEqual([1, 2, 3, 4, 5]) // 不改写原数组
  })

  it('pickOne 空名单返回 null', () => {
    expect(pickOne([])).toBe(null)
    expect(pickOne(['甲'], () => 0)).toBe('甲')
  })

  it('groupNames 均衡分组且不重不漏', () => {
    const names = Array.from({ length: 23 }, (_, i) => `同学${i + 1}`)
    const groups = groupNames(names, 4, mulberry32(7))
    expect(groups).toHaveLength(4)
    // 轮发分配:23 人分 4 组 = 6+6+6+5
    expect(groups.map((g) => g.length).sort()).toEqual([5, 6, 6, 6])
    expect(groups.flat().sort()).toEqual([...names].sort())
    // 组数多于人数时裁掉空组
    expect(groupNames(['甲', '乙'], 5)).toHaveLength(2)
  })
})
