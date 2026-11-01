import { describe, expect, it, beforeEach, vi } from 'vitest'
import { CURRENCIES, convert, rateText, formatMoney, getRates, clearRatesCache, CURRENCY_NAMES } from '@/utils/currency'

// mock 的 USD 基准汇率(模拟 frankfurter 返回结构)
const MOCK = { USD: 1, CNY: 7.0, EUR: 0.9, JPY: 150, KRW: 1300 }

beforeEach(() => {
  localStorage.clear()
  clearRatesCache()
  vi.restoreAllMocks()
})

describe('currency · 数据表', () => {
  it('货币代码唯一且都有中文名', () => {
    const codes = CURRENCIES.map((c) => c.code)
    expect(new Set(codes).size).toBe(codes.length)
    for (const c of CURRENCIES) expect(c.name.trim()).not.toBe('')
    expect(CURRENCY_NAMES.CNY).toBe('人民币')
  })
})

describe('currency · convert(USD 交叉换算)', () => {
  it('USD→CNY 直接取牌价', () => {
    expect(convert(100, MOCK, 'USD', 'CNY')).toBe(700)
  })

  it('CNY→USD 取倒数', () => {
    expect(convert(700, MOCK, 'CNY', 'USD')).toBeCloseTo(100, 6)
  })

  it('任意交叉:CNY→EUR = rates.EUR / rates.CNY', () => {
    expect(convert(70, MOCK, 'CNY', 'EUR')).toBeCloseTo(9, 6) // 70 × 0.9 / 7 = 9
  })

  it('同币种原样返回', () => {
    expect(convert(88, MOCK, 'JPY', 'JPY')).toBe(88)
  })

  it('未知货币返回 null', () => {
    expect(convert(1, MOCK, 'USD', 'XXX')).toBeNull()
    expect(convert(1, null, 'USD', 'CNY')).toBeNull()
  })

  it('零小数货币取整:JPY/KRW', () => {
    expect(convert(1, MOCK, 'USD', 'JPY')).toBe(150)
    expect(convert(10, MOCK, 'USD', 'KRW')).toBe(13000)
  })

  it('rateText 保留 6 位有效数字', () => {
    expect(rateText(MOCK, 'USD', 'CNY')).toBe('7')
    expect(rateText(MOCK, 'CNY', 'USD')).toBe('0.142857')
  })

  it('formatMoney:JPY/KRW 无小数,其余两位', () => {
    expect(formatMoney(1234.567, 'JPY')).toBe('1,235')
    expect(formatMoney(1234.5, 'CNY')).toBe('1,234.50')
  })
})

describe('currency · 缓存与离线兜底', () => {
  it('首次联网获取并写入缓存', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ amount: 1, base: 'USD', date: '2026-10-30', rates: MOCK }),
    })))
    const now = 1_000_000_000_000
    const r = await getRates({ now })
    expect(r.error).toBe('')
    expect(r.fromCache).toBe(false)
    expect(r.rates.CNY).toBe(7)
    // 缓存已落盘
    expect(JSON.parse(localStorage.getItem('toolbox-currency-rates')).rates.CNY).toBe(7)
  })

  it('TTL 内直接用缓存,不发请求', async () => {
    const now = 1_000_000_000_000
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ rates: MOCK, date: 'd' }) })))
    await getRates({ now })
    // 半小时后再取:命中缓存,fetch 不应被再次调用
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const r = await getRates({ now: now + 30 * 60 * 1000 })
    expect(r.fromCache).toBe(true)
    expect(r.stale).toBe(false)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('超过 TTL 重新联网,更新缓存', async () => {
    const now = 1_000_000_000_000
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ rates: MOCK, date: 'd1' }) })))
    await getRates({ now })
    const fetchSpy = vi.fn(async () => ({
      ok: true,
      json: async () => ({ amount: 1, base: 'USD', date: 'd2', rates: { ...MOCK, CNY: 7.5 } }),
    }))
    vi.stubGlobal('fetch', fetchSpy)
    const r = await getRates({ now: now + 2 * 60 * 60 * 1000 })
    expect(r.fromCache).toBe(false)
    expect(r.rates.CNY).toBe(7.5)
    expect(fetchSpy).toHaveBeenCalled()
  })

  it('断网时回退缓存并标记 stale', async () => {
    const now = 1_000_000_000_000
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ rates: MOCK, date: 'd1' }) })))
    await getRates({ now })
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down') }))
    const r = await getRates({ now: now + 2 * 60 * 60 * 1000 })
    expect(r.stale).toBe(true)
    expect(r.rates.CNY).toBe(7) // 旧缓存仍可用
    expect(r.error).toContain('回退')
  })

  it('无缓存且断网:返回可读错误', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    const r = await getRates({})
    expect(r.rates).toBeNull()
    expect(r.error).toContain('联网')
  })
})
