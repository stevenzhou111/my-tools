import { describe, expect, it, beforeEach, vi } from 'vitest'
import { geocode, fetchWeather, wmoInfo, WMO } from '@/utils/weather'

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('weather · WMO 代码表', () => {
  it('0~99 全覆盖且图标/描述齐全', () => {
    for (let c = 0; c <= 99; c++) {
      const info = wmoInfo(c)
      if (WMO[c]) {
        expect(info.label, String(c)).not.toContain('未知')
        expect(info.icon, String(c)).toMatch(/^[\w-]+$/)
      } else {
        expect(info.label, String(c)).toContain('未知')
      }
    }
    expect(WMO[0].label).toBe('晴')
    expect(WMO[95].icon).toBe('cloud-lightning')
  })
})

describe('weather · geocode', () => {
  it('解析候选列表字段', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
        results: [{ id: 1, name: '北京', country: '中国', admin1: '北京市', latitude: 39.9, longitude: 116.4, timezone: 'Asia/Shanghai' }],
      }),
    })))
    const r = await geocode('北京')
    expect(r.error).toBe('')
    expect(r.list[0]).toMatchObject({ name: '北京', country: '中国', latitude: 39.9 })
  })

  it('无结果返回空列表', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({}) })))
    const r = await geocode('不存在的地方xyz')
    expect(r.list).toEqual([])
  })

  it('空查询不发请求', async () => {
    const spy = vi.fn()
    vi.stubGlobal('fetch', spy)
    const r = await geocode('  ')
    expect(r.list).toEqual([])
    expect(spy).not.toHaveBeenCalled()
  })
})

describe('weather · fetchWeather 缓存与兜底', () => {
  const MOCK = {
    current: { temperature_2m: 21.3, relative_humidity_2m: 40, apparent_temperature: 20.8, weather_code: 1, wind_speed_10m: 9.7, time: '2026-11-01T12:00' },
    daily: { time: ['2026-11-01', '2026-11-02'], weather_code: [0, 61], temperature_2m_max: [23, 18], temperature_2m_min: [11, 9] },
    timezone: 'Asia/Shanghai',
  }

  it('正常获取并映射字段', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => MOCK })))
    const r = await fetchWeather(39.9, 116.4)
    expect(r.error).toBe('')
    expect(r.current.temp).toBe(21.3)
    expect(r.daily).toHaveLength(2)
  })

  it('30 分钟内命中缓存', async () => {
    const now = 1e12
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => MOCK })))
    await fetchWeather(39.9, 116.4, { now })
    const spy = vi.fn()
    vi.stubGlobal('fetch', spy)
    const r = await fetchWeather(39.9, 116.4, { now: now + 10 * 60 * 1000 })
    expect(r.fromCache).toBe(true)
    expect(spy).not.toHaveBeenCalled()
  })

  it('断网回退缓存标记 stale', async () => {
    const now = 1e12
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => MOCK })))
    await fetchWeather(39.9, 116.4, { now })
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    const r = await fetchWeather(39.9, 116.4, { now: now + 60 * 60 * 1000 })
    expect(r.stale).toBe(true)
    expect(r.current.temp).toBe(21.3)
  })

  it('无缓存且断网返回可读错误', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    const r = await fetchWeather(1, 2)
    expect(r.error).toContain('联网')
    expect(r.current).toBeUndefined()
  })
})
