import { describe, expect, it } from 'vitest'
import { nextRuns, parseCron } from '@/utils/cron'

// 固定起点:2026-10-05(周一)08:00:00;基准由 node 独立实现现算得出,勿手算修改
const FROM = new Date(2026, 9, 5, 8, 0, 0)
const fmt = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

describe('cron · parseCron', () => {
  it('标准表达式解析为字段集合', () => {
    const p = parseCron('*/15 9 1,15 * 1-5')
    expect(p.ok).toBe(true)
    expect(p.fields[0].has(0) && p.fields[0].has(15) && p.fields[0].has(30)).toBe(true)
    expect(p.fields[0].has(14)).toBe(false)
    expect(p.fields[1]).toEqual(new Set([9]))
    expect(p.fields[2]).toEqual(new Set([1, 15]))
    expect(p.fields[4].has(1) && p.fields[4].has(5)).toBe(true)
    expect(p.domStar).toBe(false)
    expect(p.dowStar).toBe(false)
  })

  it('字段数量错误与范围错误给出可读报错', () => {
    expect(parseCron('* * * *').error).toContain('5 个字段')
    expect(parseCron('60 * * * *').error).toContain('分钟')
    expect(parseCron('* 25 * * *').error).toContain('小时')
    expect(parseCron('* * 0 * *').error).toContain('日')
    expect(parseCron('* * * 13 *').error).toContain('月')
    expect(parseCron('* * * * 9').error).toContain('周')
    expect(parseCron('a * * * *').error).toContain('数字')
    expect(parseCron('1-5/0 * * * *').error).toContain('步进')
  })

  it('周字段 7 归一为周日 0', () => {
    const p = parseCron('* * * * 7')
    expect(p.fields[4].has(0)).toBe(true)
    expect(p.fields[4].has(7)).toBe(false)
  })

  it('* 标记用于日/周或语义', () => {
    expect(parseCron('* * * * *').domStar).toBe(true)
    expect(parseCron('* * 1 * *').dowStar).toBe(true)
  })
})

describe('cron · nextRuns', () => {
  it('每周一 09:30(30 9 * * 1)', () => {
    const { ok, runs } = nextRuns('30 9 * * 1', 3, FROM)
    expect(ok).toBe(true)
    expect(runs.map(fmt)).toEqual(['2026-10-05 09:30', '2026-10-12 09:30', '2026-10-19 09:30'])
  })

  it('每 15 分钟(*/15 * * * *)', () => {
    const { runs } = nextRuns('*/15 * * * *', 4, FROM)
    expect(runs.map(fmt)).toEqual([
      '2026-10-05 08:15',
      '2026-10-05 08:30',
      '2026-10-05 08:45',
      '2026-10-05 09:00',
    ])
  })

  it('每年元旦(0 0 1 1 *)', () => {
    const { runs } = nextRuns('0 0 1 1 *', 2, FROM)
    expect(runs.map(fmt)).toEqual(['2027-01-01 00:00', '2028-01-01 00:00'])
  })

  it('每月 1、15 号(0 9 1,15 * *)', () => {
    const { runs } = nextRuns('0 9 1,15 * *', 3, FROM)
    expect(runs.map(fmt)).toEqual(['2026-10-15 09:00', '2026-11-01 09:00', '2026-11-15 09:00'])
  })

  it('工作日 08:30(30 8 * * 1-5)', () => {
    const { runs } = nextRuns('30 8 * * 1-5', 3, FROM)
    expect(runs.map(fmt)).toEqual(['2026-10-05 08:30', '2026-10-06 08:30', '2026-10-07 08:30'])
  })

  it('周日 04:05,周字段写 7(5 4 * * 7)', () => {
    const { runs } = nextRuns('5 4 * * 7', 2, FROM)
    expect(runs.map(fmt)).toEqual(['2026-10-11 04:05', '2026-10-18 04:05'])
  })

  it('日与周同时受限取「或」(0 9 1 * 1,从 9-28 周一起算)', () => {
    // 9-28(周一)命中周字段,10-01(周四)命中日字段,两种分支交替出现
    const { runs } = nextRuns('0 9 1 * 1', 3, new Date(2026, 8, 28, 8, 0, 0))
    expect(runs.map(fmt)).toEqual(['2026-09-28 09:00', '2026-10-01 09:00', '2026-10-05 09:00'])
  })

  it('不跳过当前分钟之前的时刻;from 恰好命中时从下一分钟起算', () => {
    const { runs } = nextRuns('0 8 * * *', 1, FROM) // from 是 08:00 整
    expect(fmt(runs[0])).toBe('2026-10-06 08:00')
  })

  it('非法表达式返回错误', () => {
    expect(nextRuns('* * * *', 1, FROM).ok).toBe(false)
    expect(nextRuns('99 * * * *', 1, FROM).ok).toBe(false)
  })
})
