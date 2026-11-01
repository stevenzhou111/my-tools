import { describe, expect, it } from 'vitest'
import { luhnValid, cardBrand, lengthOk, formatCard, maskCard, checkCard } from '@/utils/cardCheck'

describe('cardCheck · Luhn', () => {
  it('公开测试卡号通过', () => {
    expect(luhnValid('4111111111111111')).toBe(true) // Visa 测试段
    expect(luhnValid('5500005555555559')).toBe(true) // Mastercard 测试段
    expect(luhnValid('378282246310005')).toBe(true) // Amex 测试段
    expect(luhnValid('6011111111111117')).toBe(true) // Discover 测试段
    expect(luhnValid('622202188888888880')).toBe(true) // 银联演示号(按 Luhn 构造)
  })

  it('改动任意一位即失败', () => {
    expect(luhnValid('4111111111111112')).toBe(false)
    expect(luhnValid('4111111111111141')).toBe(false)
  })

  it('非数字混入被忽略,位数不足直接否', () => {
    expect(luhnValid('4111 1111 1111 1111')).toBe(true) // 带空格
    expect(luhnValid('411111111111')).toBe(false) // 12 位不够组成合法卡
    expect(luhnValid('')).toBe(false)
  })
})

describe('cardCheck · BIN 识别', () => {
  it('主流卡组织', () => {
    expect(cardBrand('4111111111111111').id).toBe('visa')
    expect(cardBrand('5500005555555559').id).toBe('mastercard')
    expect(cardBrand('378282246310005').id).toBe('amex')
    expect(cardBrand('6222021888888888888').id).toBe('unionpay')
    expect(cardBrand('3566002020360505').id).toBe('jcb')
    expect(cardBrand('6011111111111117').id).toBe('discover')
    expect(cardBrand('30569309025904').id).toBe('diners')
  })

  it('Mastercard 2 系新段(2221~2720)', () => {
    expect(cardBrand('2221000000000009').id).toBe('mastercard')
    expect(cardBrand('2720000000000009').id).toBe('mastercard')
    expect(cardBrand('2721000000000009').id).toBe('unknown') // 2721 起不属于
    expect(cardBrand('2220000000000009').id).toBe('unknown')
  })

  it('银联 62 开头优先于其他规则', () => {
    expect(cardBrand('6200000000000005').id).toBe('unionpay')
    expect(cardBrand('9999999999999995').id).toBe('unknown')
    expect(cardBrand('')).toBeNull()
  })
})

describe('cardCheck · 位数与格式', () => {
  it('位数规范:Amex 15、Diners 14、银联 16~19', () => {
    expect(lengthOk('378282246310005')).toBe(true)
    expect(lengthOk('30569309025904')).toBe(true)
    expect(lengthOk('6222021888888888888')).toBe(true) // 19 位
    expect(lengthOk('6222021888888888')).toBe(true) // 16 位
    expect(lengthOk('622202188888888')).toBe(false) // 15 位不在银联规范
    expect(lengthOk('1234567890123456')).toBeNull() // 未知组织无法判定
  })

  it('分组:Amex 4-6-5,其余每 4 位', () => {
    expect(formatCard('378282246310005')).toBe('3782 822463 10005')
    expect(formatCard('4111111111111111')).toBe('4111 1111 1111 1111')
  })

  it('打码:保留前 6 后 4', () => {
    expect(maskCard('6222021888888888888')).toBe('622202 ********* 8888') // 19 位 → 9 个 *
    expect(maskCard('4111111111111111')).toBe('411111 ****** 1111') // 16 位 → 6 个 *
  })
})

describe('cardCheck · checkCard 汇总', () => {
  it('正常卡返回完整信息', () => {
    const r = checkCard('4111 1111 1111 1111')
    expect(r.error).toBe('')
    expect(r.data.luhn).toBe(true)
    expect(r.data.brand.id).toBe('visa')
    expect(r.data.lengthOk).toBe(true)
    expect(r.data.masked).toBe('411111 ****** 1111')
  })

  it('空号与过短报可读错误', () => {
    expect(checkCard('').error).toBeTruthy()
    expect(checkCard('4111').error).toBeTruthy()
  })
})
