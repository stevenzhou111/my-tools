import { describe, expect, it } from 'vitest'
import {
  parseTimecode, formatTimecode, parseSubtitles, toSrt, toVtt, shiftCues, scaleCues, totalDuration,
} from '../../src/utils/srt'

const SRT_SAMPLE = `1
00:00:01,000 --> 00:00:03,500
第一句

2
00:00:04,200 --> 00:00:06,000
第二句第一行
第二句第二行
`

const VTT_SAMPLE = `WEBVTT

00:01.000 --> 00:03.500 align:start line:0%
第一句

cue-2
00:04.200 --> 00:06.000
第二句
`

describe('srt · 时间码', () => {
  it('解析完整/省略小时/逗号与点分隔', () => {
    expect(parseTimecode('00:01:02,345')).toBe(62345)
    expect(parseTimecode('01:02.345')).toBe(62345)
    expect(parseTimecode('00:01:02.345')).toBe(62345)
    expect(parseTimecode(' 0:00:00,001 ')).toBe(1)
  })

  it('非法时间码抛可读错误', () => {
    expect(() => parseTimecode('abc')).toThrow('时间码不合法')
    expect(() => parseTimecode('00:01:02')).toThrow('时间码不合法')
  })

  it('格式化:SRT 逗号 / VTT 点;负值截断为 0', () => {
    expect(formatTimecode(62345)).toBe('00:01:02,345')
    expect(formatTimecode(62345, { vtt: true })).toBe('00:01:02.345')
    expect(formatTimecode(-5)).toBe('00:00:00,000')
    expect(formatTimecode(3600000)).toBe('01:00:00,000')
  })
})

describe('srt · 解析与互转', () => {
  it('SRT 解析:多行文本保留,空块跳过', () => {
    const { format, cues } = parseSubtitles(SRT_SAMPLE)
    expect(format).toBe('srt')
    expect(cues).toHaveLength(2)
    expect(cues[0]).toEqual({ start: 1000, end: 3500, text: '第一句' })
    expect(cues[1].text).toBe('第二句第一行\n第二句第二行')
  })

  it('VTT 解析:识别 WEBVTT 头、省略小时的时间码、cue 设置与标识行', () => {
    const { format, cues } = parseSubtitles(VTT_SAMPLE)
    expect(format).toBe('vtt')
    expect(cues).toHaveLength(2)
    expect(cues[0]).toEqual({ start: 1000, end: 3500, text: '第一句' })
    expect(cues[1].text).toBe('第二句')
  })

  it('SRT→VTT→SRT 往返无损', () => {
    const parsed = parseSubtitles(SRT_SAMPLE)
    expect(parseSubtitles(toVtt(parsed.cues)).cues).toEqual(parsed.cues)
    expect(toSrt(parseSubtitles(toVtt(parsed.cues)).cues)).toBe(toSrt(parsed.cues))
  })

  it('BOM 与 CRLF 兼容', () => {
    const { cues } = parseSubtitles('\uFEFF' + SRT_SAMPLE.replace(/\n/g, '\r\n'))
    expect(cues).toHaveLength(2)
  })

  it('空内容 / 无时间轴 / 起止倒置 / 全空文本 各自抛可读错误', () => {
    expect(() => parseSubtitles('')).toThrow('内容为空')
    expect(() => parseSubtitles('随便一些文字')).toThrow('没有解析出任何字幕')
    expect(() => parseSubtitles('WEBVTT\n\n没有时间轴的块')).toThrow('没有解析出任何字幕')
    expect(() => parseSubtitles('1\n00:00:05,000 --> 00:00:01,000\n倒置')).toThrow('时间轴起止倒置')
    expect(() => parseSubtitles('1\n00:00:01,000 --> 00:00:02,000\n\n\n2\n00:00:03,000 --> 00:00:04,000\n')).toThrow()
  })
})

describe('srt · 时间轴变换', () => {
  const cues = parseSubtitles(SRT_SAMPLE).cues

  it('平移:正负均可,负平移截断到 0', () => {
    expect(shiftCues(cues, 500)[0].start).toBe(1500)
    const back = shiftCues(cues, -2000)
    expect(back[0]).toEqual({ start: 0, end: 1500, text: '第一句' })
    expect(back[1].start).toBe(2200)
  })

  it('缩放:帧率修正场景,非法系数抛错', () => {
    const scaled = scaleCues(cues, 25 / 23.976)
    expect(scaled[0].start).toBe(Math.round(1000 * 25 / 23.976))
    expect(scaled[1].end).toBe(Math.round(6000 * 25 / 23.976))
    expect(() => scaleCues(cues, 0)).toThrow('缩放系数')
    expect(() => scaleCues(cues, -1)).toThrow('缩放系数')
  })

  it('总时长取最后一条的结束时间', () => {
    expect(totalDuration(cues)).toBe(6000)
  })
})
