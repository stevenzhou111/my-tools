import { describe, expect, it, beforeEach, vi } from 'vitest'
import { translate, byteLength, MAX_BYTES, LANGS } from '@/utils/translate'

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('translate · 基础', () => {
  it('语言表:代码唯一、含中英', () => {
    const codes = LANGS.map((l) => l.code)
    expect(new Set(codes).size).toBe(codes.length)
    expect(codes).toContain('zh-CN')
    expect(codes).toContain('en')
  })

  it('UTF-8 字节数:中文 3 字节/字', () => {
    expect(byteLength('abc')).toBe(3)
    expect(byteLength('你好')).toBe(6)
    expect(byteLength('')).toBe(0)
  })
})

describe('translate · 翻译流程', () => {
  it('正常翻译并解析结果', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ responseStatus: 200, responseData: { translatedText: 'Hello.', match: 0.9 }, matches: [] }),
    })))
    const r = await translate('你好', 'zh-CN', 'en')
    expect(r.error).toBe('')
    expect(r.text).toBe('Hello.')
    expect(r.fromCache).toBe(false)
  })

  it('空文本 / 同语言 / 超长分别报可读错误', async () => {
    expect((await translate('  ', 'zh-CN', 'en')).error).toContain('输入')
    expect((await translate('hi', 'en', 'en')).error).toContain('相同')
    const r = await translate('你'.repeat(200), 'zh-CN', 'en') // 600 字节
    expect(r.error).toContain('超长')
  })

  it('额度用完抛可读错误', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ responseStatus: 403, quotaFinished: true, responseData: {}, responseDetails: '' }),
    })))
    const r = await translate('hi', 'en', 'zh-CN')
    expect(r.error).toContain('额度')
  })

  it('responseStatus 非 200 时透出服务端说明', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ responseStatus: 403, responseData: {}, responseDetails: 'Invalid language pair' }),
    })))
    const r = await translate('hi', 'xx', 'en')
    expect(r.error).toContain('Invalid language pair')
  })
})

describe('translate · 缓存', () => {
  it('同文本 24 小时内命中缓存,不发请求', async () => {
    const now = 1e12
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ responseStatus: 200, responseData: { translatedText: 'Hello.', match: 0.9 } }),
    })))
    await translate('你好', 'zh-CN', 'en', { now })
    const spy = vi.fn()
    vi.stubGlobal('fetch', spy)
    const r = await translate('你好', 'zh-CN', 'en', { now: now + 3600_000 })
    expect(r.text).toBe('Hello.')
    expect(r.fromCache).toBe(true)
    expect(spy).not.toHaveBeenCalled()
  })

  it('不同语言对各自缓存', async () => {
    const spy = vi.fn(async () => ({
      ok: true,
      json: async () => ({ responseStatus: 200, responseData: { translatedText: 'ok', match: 1 } }),
    }))
    vi.stubGlobal('fetch', spy)
    await translate('hi', 'en', 'zh-CN')
    await translate('hi', 'en', 'ja')
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('断网时回退过期缓存', async () => {
    const now = 1e12
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ responseStatus: 200, responseData: { translatedText: 'Hello.', match: 0.9 } }),
    })))
    await translate('你好', 'zh-CN', 'en', { now })
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    const r = await translate('你好', 'zh-CN', 'en', { now: now + 2 * 86400_000 })
    expect(r.text).toBe('Hello.')
    expect(r.error).toContain('回退')
  })
})

describe('translate · MAX_BYTES 常量', () => {
  it('上限为 500 字节', () => {
    expect(MAX_BYTES).toBe(500)
  })
})
