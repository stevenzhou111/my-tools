import { describe, expect, it } from 'vitest'
import { mergeDuration, mergeTracks, normalizeTracks } from '@/utils/audioJoin'
import { encodeWav } from '@/utils/wav'

function expectNear(actual, expected) {
  expect(actual).toHaveLength(expected.length)
  expected.forEach((v, i) => expect(actual[i]).toBeCloseTo(v, 6))
}

function track(samples, sampleRate = 8000, channels = 1) {
  const list = Array.isArray(samples[0]) ? samples : [samples]
  return {
    sampleRate,
    channels: list.map((s) => Float32Array.from(s)),
    numberOfChannels: list.length,
    getChannelData: (i) => Float32Array.from(list[i]),
  }
}

describe('audioJoin', () => {
  it('按顺序拼接并在段间插入静音间隙', () => {
    const out = mergeTracks([track([1, 1], 8), track([0.5], 8)], { sampleRate: 8, gapSeconds: 0.25, fadeSeconds: 0 })
    expect(out.length).toBe(5)
    expect([...out.getChannelData(0)]).toEqual([1, 1, 0, 0, 0.5])
    expect(mergeDuration(out)).toBeCloseTo(0.625)
  })

  it('单声道与立体声混合时统一为立体声', () => {
    const mono = track([0.1, 0.2])
    const stereo = track([[1, 0.5], [-1, -0.5]], 8000, 2)
    expect(normalizeTracks([mono, stereo])[0].channels).toHaveLength(2)
    const out = mergeTracks([mono, stereo], { sampleRate: 8000, fadeSeconds: 0 })
    expect(out.numberOfChannels).toBe(2)
    expectNear([...out.getChannelData(0)], [0.1, 0.2, 1, 0.5])
    expectNear([...out.getChannelData(1)], [0.1, 0.2, -1, -0.5])
  })

  it('接缝淡入淡出让首尾样本趋近 0,中间不受影响', () => {
    const out = mergeTracks([track([1, 1, 1, 1], 8)], { sampleRate: 8, fadeSeconds: 0.25 })
    expectNear([...out.getChannelData(0)], [0, 0.5, 0.5, 0])
  })

  it('采样率不一致时报错', () => {
    expect(() => mergeTracks([track([1], 8000), track([1], 44100)], { sampleRate: 8000 })).toThrow('采样率')
  })

  it('空列表报错', () => {
    expect(() => mergeTracks([], { sampleRate: 8000 })).toThrow('至少')
  })
})

describe('encodeWav', () => {
  it('输出合法的 16bit PCM RIFF 头', async () => {
    const buf = mergeTracks([track([1, -1])], { sampleRate: 8000, fadeSeconds: 0 })
    const blob = encodeWav(buf)
    expect(blob.type).toBe('audio/wav')
    expect(blob.size).toBe(44 + 2 * 2)

    const view = new DataView(await blob.arrayBuffer())
    const str = (offset, n) => String.fromCharCode(...new Uint8Array(view.buffer, offset, n))
    expect(str(0, 4)).toBe('RIFF')
    expect(view.getUint32(4, true)).toBe(blob.size - 8)
    expect(str(8, 8)).toBe('WAVEfmt ')
    expect(view.getUint16(20, true)).toBe(1)
    expect(view.getUint16(22, true)).toBe(1)
    expect(view.getUint32(24, true)).toBe(8000)
    expect(view.getUint16(34, true)).toBe(16)
    expect(str(36, 4)).toBe('data')
    expect(view.getUint32(40, true)).toBe(4)
    expect(view.getInt16(44, true)).toBe(0x7fff)
    expect(view.getInt16(46, true)).toBe(-0x8000)
  })
})