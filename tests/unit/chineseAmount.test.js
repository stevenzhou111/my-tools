import { describe, expect, it } from 'vitest'
import { toChineseAmount } from '@/utils/chineseAmount'

const ok = (s) => toChineseAmount(s).text
const err = (s) => toChineseAmount(s).error

describe('toChineseAmount · 基本转换', () => {
  it('标准金额', () => {
    expect(ok('1234.56')).toBe('壹仟贰佰叁拾肆圆伍角陆分')
    expect(ok('0.05')).toBe('伍分')
    expect(ok('0.5')).toBe('伍角整')
    expect(ok('1.05')).toBe('壹圆零伍分')
    expect(ok('100.01')).toBe('壹佰圆零壹分')
  })

  it('整数金额以「整」结尾', () => {
    expect(ok('120')).toBe('壹佰贰拾圆整')
    expect(ok('10')).toBe('壹拾圆整')
    expect(ok('1')).toBe('壹圆整')
    expect(ok('0')).toBe('零圆整')
    expect(ok('0.00')).toBe('零圆整')
  })

  it('「拾」位必须带壹(财务规范:10 是壹拾,不是拾)', () => {
    expect(ok('15')).toBe('壹拾伍圆整')
    expect(ok('150')).toBe('壹佰伍拾圆整')
  })

  it('节内补零', () => {
    expect(ok('1005')).toBe('壹仟零伍圆整')
    expect(ok('1010')).toBe('壹仟零壹拾圆整')
    expect(ok('1000')).toBe('壹仟圆整')
    expect(ok('1000000')).toBe('壹佰万圆整')
    expect(ok('1000001')).toBe('壹佰万零壹圆整')
  })

  it('万与亿分节', () => {
    expect(ok('10001')).toBe('壹万零壹圆整')
    expect(ok('11000')).toBe('壹万壹仟圆整')
    expect(ok('123456789')).toBe('壹亿贰仟叁佰肆拾伍万陆仟柒佰捌拾玖圆整')
    expect(ok('100000000')).toBe('壹亿圆整')
    // 100000000001 中间的万节为零 → 亿和个位之间要补零
    expect(ok('100000000001')).toBe('壹仟亿零壹圆整')
    expect(ok('99999999999.99')).toBe('玖佰玖拾玖亿玖仟玖佰玖拾玖万玖仟玖佰玖拾玖圆玖角玖分')
  })

  it('千分位逗号与空白容错', () => {
    expect(ok('1,234.56')).toBe('壹仟贰佰叁拾肆圆伍角陆分')
    expect(ok(' 1234.56 ')).toBe('壹仟贰佰叁拾肆圆伍角陆分')
    expect(ok('1，234.56')).toBe('壹仟贰佰叁拾肆圆伍角陆分')
  })
})

describe('toChineseAmount · 非法输入', () => {
  it('负数、三位小数、非数字被拒绝', () => {
    expect(err('-1')).toBeTruthy()
    expect(err('1.234')).toBeTruthy()
    expect(err('abc')).toBeTruthy()
    expect(err('')).toBe('')
    expect(err('12a')).toBeTruthy()
  })

  it('超 9999 亿被拒绝', () => {
    expect(err('10000000000000')).toBeTruthy()
    expect(ok('999999999999.99')).toBeTruthy() // 9999,9999,9999.99 恰在上限内
  })
})