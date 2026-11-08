import { describe, expect, it } from 'vitest'
import { sizeMB, bitrateKbps, downloadSeconds, humanSeconds } from '../../src/utils/mediaCalc'
import { buildUtmUrl, UTM_FIELDS } from '../../src/utils/utm'

describe('mediaCalc · 码率/体积/下载时间', () => {
  it('体积 = 时长 × 码率(1 分钟 @ 8000 kbps ≈ 58.6 MB)', () => {
    expect(sizeMB(60, 8000)).toBeCloseTo(58.59, 2)
    expect(sizeMB(60, 8000)).toBe(60000 / 1024)
  })

  it('反向:码率 = 体积 ÷ 时长', () => {
    expect(bitrateKbps(60000 / 1024, 60)).toBeCloseTo(8000, 5)
  })

  it('下载时间 = 体积 × 8 ÷ 带宽', () => {
    expect(downloadSeconds(100, 100)).toBe(8)
    expect(humanSeconds(downloadSeconds(1024, 100))).toBe('1 分 22 秒')
  })

  it('非法输入抛可读错误', () => {
    expect(() => sizeMB(0, 8000)).toThrow('大于 0')
    expect(() => bitrateKbps(-1, 60)).toThrow('大于 0')
    expect(() => downloadSeconds(100, 0)).toThrow('大于 0')
  })

  it('humanSeconds 分层显示', () => {
    expect(humanSeconds(59)).toBe('59 秒')
    expect(humanSeconds(60)).toBe('1 分 0 秒')
    expect(humanSeconds(3661)).toBe('1 小时 1 分 1 秒')
  })
})

describe('utm · 链接生成', () => {
  it('追加非空 utm 参数,保留既有查询与 hash', () => {
    const out = buildUtmUrl('https://example.com/page?a=1#sec', {
      utm_source: 'newsletter',
      utm_medium: 'email',
      utm_campaign: 'launch',
      utm_term: '',
      utm_content: '  ',
    })
    const u = new URL(out)
    expect(u.searchParams.get('a')).toBe('1')
    expect(u.searchParams.get('utm_source')).toBe('newsletter')
    expect(u.searchParams.get('utm_medium')).toBe('email')
    expect(u.searchParams.get('utm_campaign')).toBe('launch')
    expect(u.searchParams.has('utm_term')).toBe(false)
    expect(u.hash).toBe('#sec')
  })

  it('重复生成先清旧 utm_*,不叠加', () => {
    const once = buildUtmUrl('https://example.com/?utm_source=old', { utm_source: 'new', utm_medium: 'cpc' })
    expect(new URL(once).searchParams.get('utm_source')).toBe('new')
    const twice = buildUtmUrl(once, { utm_source: 'final' })
    const u = new URL(twice)
    expect(u.searchParams.getAll('utm_source')).toEqual(['final'])
    expect(u.searchParams.has('utm_medium')).toBe(false)
  })

  it('值中的空格与中文正确编码', () => {
    const u = new URL(buildUtmUrl('https://example.com/', { utm_campaign: '春季 活动' }))
    expect(u.searchParams.get('utm_campaign')).toBe('春季 活动')
  })

  it('非法输入抛可读错误', () => {
    expect(() => buildUtmUrl('not-a-url', {})).toThrow('合法')
    expect(() => buildUtmUrl('ftp://example.com/', {})).toThrow('http/https')
  })

  it('UTM_FIELDS 五个键与官方口径一致', () => {
    expect(UTM_FIELDS.map((f) => f.key)).toEqual(['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'])
  })
})

describe('mp3Encode · 编码冒烟', () => {
  it('1 秒 440Hz 正弦 44.1k 单声道 → 合法 MP3 帧流', async () => {
    const { encodeMp3 } = await import('../../src/utils/mp3Encode')
    const sr = 44100
    const pcm = new Float32Array(sr).map((_, i) => Math.sin((2 * Math.PI * 440 * i) / sr) * 0.5)
    const fakeBuffer = { numberOfChannels: 1, sampleRate: sr, getChannelData: () => pcm }
    let last = 0
    const blob = await encodeMp3(fakeBuffer, { kbps: 128, onProgress: (p) => { last = p } })
    expect(last).toBe(1)
    expect(blob.type).toBe('audio/mpeg')
    const bytes = new Uint8Array(await blob.arrayBuffer())
    expect(bytes.length).toBeGreaterThan(8000) // 128kbps × 1s ≈ 16KB
    expect(bytes[0]).toBe(0xff) // MP3 帧同步
    expect(bytes[1] & 0xe0).toBe(0xe0)
  })
})
