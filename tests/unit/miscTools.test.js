import { describe, expect, it } from 'vitest'
import { toPinyin, PINYIN_MODES } from '../../src/utils/pinyinTool'
import { isoWeekOf, isoWeekRange, weeksInYear } from '../../src/utils/isoWeek'
import { parseLine, sumTimesheet, humanMinutes } from '../../src/utils/timesheet'
import { levenshtein, similarity } from '../../src/utils/editDistance'

describe('pinyinTool · 文本转拼音', () => {
  it('四种模式输出', () => {
    expect(toPinyin('重庆', 'tone')).toBe('chóng qìng') // 多音字按词组语境:重 chóng 是二声
    expect(toPinyin('重庆', 'num')).toBe('chong2 qing4')
    expect(toPinyin('重庆', 'normal')).toBe('chong qing')
    expect(toPinyin('重庆', 'first')).toBe('c q')
  })

  it('非中文字符原样保留', () => {
    expect(toPinyin('abc 123', 'normal')).toBe('abc 123')
  })

  it('空输入返回空串;模式表齐全', () => {
    expect(toPinyin('', 'tone')).toBe('')
    expect(toPinyin('  ', 'tone')).toBe('')
    expect(PINYIN_MODES.map((m) => m.id)).toEqual(['tone', 'num', 'normal', 'first'])
  })
})

describe('isoWeek · ISO 周历', () => {
  it('已知锚点:2021-01-01 属于 2020 年第 53 周', () => {
    expect(isoWeekOf(new Date(2021, 0, 1))).toEqual({ year: 2020, week: 53 })
  })

  it('2026-01-01(周四)是 2026 年第 1 周', () => {
    expect(isoWeekOf(new Date(2026, 0, 1))).toEqual({ year: 2026, week: 1 })
  })

  it('年周区间:周一到周日', () => {
    const { monday, sunday } = isoWeekRange(2026, 1)
    expect(monday.toDateString()).toBe(new Date(2025, 11, 29).toDateString())
    expect(sunday.toDateString()).toBe(new Date(2026, 0, 4).toDateString())
  })

  it('同一周内的日期返回同一周号', () => {
    expect(isoWeekOf(new Date(2026, 0, 5))).toEqual({ year: 2026, week: 2 })
    expect(isoWeekOf(new Date(2026, 0, 4))).toEqual({ year: 2026, week: 1 })
  })

  it('53 周年份与非法输入', () => {
    expect(weeksInYear(2020)).toBe(53)
    expect(weeksInYear(2026)).toBe(53)
    expect(weeksInYear(2027)).toBe(52)
    expect(() => isoWeekRange(2026, 0)).toThrow('1~53')
    expect(() => isoWeekRange(2026.5, 1)).toThrow('整数')
  })
})

describe('timesheet · 工时累加', () => {
  it('区间行:含跨午夜', () => {
    expect(parseLine('09:00-18:00').minutes).toBe(540)
    expect(parseLine('22:00-06:00').minutes).toBe(480)
    expect(parseLine('9:00~17:30').minutes).toBe(510)
  })

  it('纯时长行:8.5h / 90m / 2:15', () => {
    expect(parseLine('8.5h').minutes).toBe(510)
    expect(parseLine('90m').minutes).toBe(90)
    expect(parseLine('2:15').minutes).toBe(135)
    expect(parseLine('7.5小时').minutes).toBe(450)
  })

  it('错行给出原因,不影响其它行', () => {
    const r = sumTimesheet('09:00-18:00\n摸鱼\n8h')
    expect(r.errors).toHaveLength(1)
    expect(r.errors[0].line).toBe(2)
    expect(r.totalMinutes).toBe(1020)
    expect(r.human).toBe('17 小时 0 分')
  })

  it('空行跳过;humanMinutes', () => {
    const r = sumTimesheet('\n8h\n\n1h\n')
    expect(r.totalMinutes).toBe(540)
    expect(humanMinutes(540)).toBe('9 小时 0 分')
  })

  it('非法时间(25:00)报错', () => {
    expect(parseLine('25:00-26:00').error).toContain('不合法')
  })
})

describe('editDistance · 编辑距离与相似度', () => {
  it('经典向量', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3)
    expect(levenshtein('flaw', 'lawn')).toBe(2)
    expect(levenshtein('', 'abc')).toBe(3)
    expect(levenshtein('same', 'same')).toBe(0)
  })

  it('emoji 按码点算一个字符', () => {
    expect(levenshtein('👍', '👎')).toBe(1)
    expect([...'👍'].length).toBe(1)
  })

  it('相似度百分比', () => {
    expect(similarity('kitten', 'sitting')).toBe(57) // 1 - 3/7
    expect(similarity('abc', 'abc')).toBe(100)
    expect(similarity('', '')).toBe(100)
    expect(similarity('abc', 'xyz')).toBe(0)
  })
})
