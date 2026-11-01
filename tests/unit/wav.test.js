import { describe, expect, it } from 'vitest'
import { encodeWav } from '@/utils/wav'

/** 造一个最小 AudioBuffer 形状的假对象(纯数据,不需要 AudioContext) */
function fakeBuffer(channels, sampleRate, frames) {
  return {
    numberOfChannels: channels,
    sampleRate,
    length: frames,
    getChannelData: (ch) => {
      const data = new Float32Array(frames)
      for (let i = 0; i < frames; i++) data[i] = ch === 0 ? (i % 11) / 20 - 0.2 : 0.5
      return data
    },
  }
}

function riffView(blob) {
  return blob.arrayBuffer().then((ab) => new DataView(ab))
}

describe('wav · encodeWav', () => {
  it('头部字段:RIFF/WAVE、声道数与采样率', async () => {
    const blob = encodeWav(fakeBuffer(2, 44100, 8))
    expect(blob.type).toBe('audio/wav')
    const v = await riffView(blob)
    expect(String.fromCharCode(v.getUint8(0), v.getUint8(1), v.getUint8(2), v.getUint8(3))).toBe('RIFF')
    expect(String.fromCharCode(v.getUint8(8), v.getUint8(9), v.getUint8(10), v.getUint8(11))).toBe('WAVE')
    expect(v.getUint16(22, true)).toBe(2) // 声道
    expect(v.getUint32(24, true)).toBe(44100) // 采样率
    expect(v.getUint16(34, true)).toBe(16) // 位深
  })

  it('体积 = 44 头 + 帧 × 声道 × 2 字节', async () => {
    const blob = encodeWav(fakeBuffer(1, 16000, 100))
    expect(blob.size).toBe(44 + 100 * 1 * 2)
    const v = await riffView(blob)
    expect(v.getUint32(40, true)).toBe(100 * 1 * 2) // data 块长度
  })

  it('样本钳制在 [-1, 1] 且编码为小端 int16', async () => {
    const buf = {
      numberOfChannels: 1,
      sampleRate: 8000,
      length: 3,
      getChannelData: () => new Float32Array([2.0, -2.0, 0.5]),
    }
    const v = await riffView(encodeWav(buf))
    expect(v.getInt16(44, true)).toBe(0x7fff) // 2.0 → 正满幅
    expect(v.getInt16(46, true)).toBe(-0x8000) // -2.0 → 负满幅
    expect(v.getInt16(48, true)).toBe(16383) // 0.5 × 0x7fff,setInt16 截断小数
  })
})
