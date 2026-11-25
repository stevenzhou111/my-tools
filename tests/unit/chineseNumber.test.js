import { describe, expect, it } from 'vitest'
import { chineseToNumber, numberToChinese } from '@/utils/chineseNumber'

const cn = (s) => numberToChinese(s).text
const ar = (s) => chineseToNumber(s).value

describe('numberToChinese', () => {
  it('个位、十位与百位', () => {
    expect(cn('0')).toBe('零')
    expect(cn('10')).toBe('十')
    expect(cn('11')).toBe('十一')
    expect(cn('12')).toBe('十二')
    expect(cn('20')).toBe('二十')
    expect(cn('99')).toBe('九十九')
    expect(cn('100')).toBe('一百')
    expect(cn('101')).toBe('一百零一')
    expect(cn('110')).toBe('一百一十')
    expect(cn('111')).toBe('一百一十一')
  })

  it('千、万、亿的零位补齐', () => {
    expect(cn('1000')).toBe('一千')
    expect(cn('1001')).toBe('一千零一')
    expect(cn('1010')).toBe('一千零一十')
    expect(cn('1100')).toBe('一千一百')
    expect(cn('10000')).toBe('一万')
    expect(cn('10001')).toBe('一万零一')
    expect(cn('10010')).toBe('一万零一十')
    expect(cn('11000')).toBe('一万一千')
    expect(cn('100000000')).toBe('一亿')
    expect(cn('100000001')).toBe('一亿零一')
    expect(cn('1234567890')).toBe('十二亿三千四百五十六万七千八百九十')
  })

  it('负数与小数', () => {
    expect(cn('-3.14')).toBe('负三点一四')
    expect(cn('0.5')).toBe('零点五')
    expect(cn('1.00')).toBe('一点零零')
    expect(cn('-0')).toBe('零')
  })

  it('兆与京,以及超大数精度', () => {
    expect(cn('1000000000000')).toBe('一兆')
    expect(cn('10000000000000000')).toBe('一京')
    expect(cn('12345678901234567890')).toBe(
      '一千二百三十四京五千六百七十八兆九千零一十二亿三千四百五十六万七千八百九十',
    )
  })

  it('非法输入与超范围', () => {
    expect(numberToChinese('1e3').error).toBeTruthy()
    expect(numberToChinese('abc').error).toBeTruthy()
    expect(numberToChinese('1.2.3').error).toBeTruthy()
    expect(numberToChinese('100000000000000000000').error).toContain('超出范围')
  })
})

describe('chineseToNumber', () => {
  it('标准读法', () => {
    expect(ar('十二')).toBe('12')
    expect(ar('一百二十三')).toBe('123')
    expect(ar('一千零一十')).toBe('1010')
    expect(ar('一万零一')).toBe('10001')
    expect(ar('一亿零五万')).toBe('100050000')
    expect(ar('一万亿')).toBe('1000000000000')
  })

  it('口语省略与带零写法', () => {
    expect(ar('一百二')).toBe('120')
    expect(ar('三千五')).toBe('3500')
    expect(ar('一万二')).toBe('12000')
    expect(ar('一亿二')).toBe('120000000')
    expect(ar('一百零二')).toBe('102')
    expect(ar('一千零二')).toBe('1002')
    expect(ar('一万零二')).toBe('10002')
  })

  it('负数、小数、两/廿/卅与大写数字', () => {
    expect(ar('负三点一四')).toBe('-3.14')
    expect(ar('负零点五')).toBe('-0.5')
    expect(ar('负零')).toBe('0')
    expect(ar('点五')).toBe('0.5')
    expect(ar('两')).toBe('2')
    expect(ar('廿三')).toBe('23')
    expect(ar('卅五')).toBe('35')
    expect(ar('壹佰贰拾叁')).toBe('123')
    expect(ar('參仟')).toBe('3000')
  })

  it('逐位读法与阿拉伯数字原样返回', () => {
    expect(ar('二零二四')).toBe('2024')
    expect(ar('一二三')).toBe('123')
    expect(ar('123.45')).toBe('123.45')
    expect(ar('１２３')).toBe('123')
  })

  it('非法字符与悬空单位', () => {
    expect(chineseToNumber('一百abc').error).toBeTruthy()
    expect(chineseToNumber('万五').error).toBeTruthy()
    expect(chineseToNumber('三点').error).toBeTruthy()
    expect(chineseToNumber('一点二点三').error).toBeTruthy()
    expect(chineseToNumber('').value).toBe('')
  })
})

describe('双向 round-trip', () => {
  it('整数与小数往返一致', () => {
    const cases = ['0', '1', '9', '10', '11', '12', '20', '99', '100', '101', '110', '1000', '1001', '1010', '9999', '10000', '10001', '10012', '100000000', '1234567890', '12345678901234567890']
    for (const n of cases) {
      expect(ar(cn(n)), `round-trip ${n}`).toBe(n)
    }
    expect(ar(cn('3.14'))).toBe('3.14')
    expect(ar(cn('120.05'))).toBe('120.05')
  })
})