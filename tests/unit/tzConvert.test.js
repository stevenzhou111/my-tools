import { describe, expect, it } from 'vitest'
import { offsetLabel, tzOffsetMin, wallTimeToInstant, zoneRows, ZONES } from '@/utils/tzConvert'

const WINTER = new Date('2026-01-15T00:00:00Z') // 北半球冬季(伦敦 GMT,纽约 EST)
const SUMMER = new Date('2026-07-15T12:00:00Z') // 北半球夏季(伦敦 BST,纽约 EDT)

describe('tzOffsetMin', () => {
  it('冬季:北京 +480,伦敦 0,纽约 -300', () => {
    expect(tzOffsetMin('Asia/Shanghai', WINTER)).toBe(480)
    expect(tzOffsetMin('Europe/London', WINTER)).toBe(0)
    expect(tzOffsetMin('America/New_York', WINTER)).toBe(-300)
  })

  it('夏令时:夏季伦敦 +60、纽约 -240', () => {
    expect(tzOffsetMin('Europe/London', SUMMER)).toBe(60)
    expect(tzOffsetMin('America/New_York', SUMMER)).toBe(-240)
    // 中国无夏令时
    expect(tzOffsetMin('Asia/Shanghai', SUMMER)).toBe(480)
  })
})

describe('zoneRows', () => {
  it('同一时刻各区本地时间正确', () => {
    const rows = zoneRows(WINTER)
    const byTz = Object.fromEntries(rows.map((r) => [r.tz, r]))
    expect(byTz['Asia/Shanghai'].time).toBe('08:00')
    expect(byTz['Asia/Shanghai'].date).toBe('2026-01-15')
    expect(byTz['America/New_York'].time).toBe('19:00')
    expect(byTz['America/New_York'].date).toBe('2026-01-14') // 还在昨天
    expect(byTz['Europe/London'].offset).toBe('UTC+0')
  })

  it('包含工作日标记:UTC 04:00 时北京 12:00 在工作时段,纽约 23:00 不在', () => {
    const at = new Date('2026-01-15T04:00:00Z')
    const byTz = Object.fromEntries(zoneRows(at).map((r) => [r.tz, r]))
    expect(byTz['Asia/Shanghai'].time).toBe('12:00')
    expect(byTz['Asia/Shanghai'].isWorkday).toBe(true)
    expect(byTz['America/New_York'].time).toBe('23:00')
    expect(byTz['America/New_York'].isWorkday).toBe(false)
  })

  it('周几为中文', () => {
    const rows = zoneRows(WINTER) // 2026-01-15 是周四
    expect(rows[0].weekday).toBe('周四')
  })

  it('时区清单无重复且都有中文标签', () => {
    const tzSet = new Set(ZONES.map((z) => z.tz))
    expect(tzSet.size).toBe(ZONES.length)
    for (const z of ZONES) expect(z.label.trim()).not.toBe('')
  })
})

describe('offsetLabel', () => {
  it('整小时与半小时偏移', () => {
    expect(offsetLabel(480)).toBe('UTC+8')
    expect(offsetLabel(-300)).toBe('UTC-5')
    expect(offsetLabel(330)).toBe('UTC+5:30')
    expect(offsetLabel(0)).toBe('UTC+0')
  })
})

describe('wallTimeToInstant', () => {
  it('按目标时区的墙上时间换算回绝对时刻', () => {
    // 北京时间 2026-01-15 08:00 = UTC 00:00
    const at = wallTimeToInstant('2026-01-15T08:00', 'Asia/Shanghai')
    expect(at.toISOString()).toBe('2026-01-15T00:00:00.000Z')
  })

  it('夏令时期间换算正确', () => {
    // 纽约夏令时 UTC-4:本地 08:00 = UTC 12:00
    const at = wallTimeToInstant('2026-07-15T08:00', 'America/New_York')
    expect(at.toISOString()).toBe('2026-07-15T12:00:00.000Z')
  })

  it('非法输入返回 null', () => {
    expect(wallTimeToInstant('not-a-date', 'Asia/Shanghai')).toBeNull()
    expect(wallTimeToInstant('', 'Asia/Shanghai')).toBeNull()
  })
})