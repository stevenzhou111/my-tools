import { describe, expect, it } from 'vitest'
import { dueDateInfo } from '@/utils/dueDate'

describe('dueDate · Naegele 法则', () => {
  it('周期 28 天:末次月经 + 280 天', () => {
    const r = dueDateInfo('2026-01-01', 28, '2026-01-01')
    expect(r.error).toBe('')
    expect(r.data.dueText).toBe('2026 年 10 月 8 日') // 1/1 + 280
    expect(r.data.week).toBe(0)
    expect(r.data.day).toBe(0)
  })

  it('周期修正:30 天推后 2 天,26 天提前 2 天', () => {
    expect(dueDateInfo('2026-01-01', 30, '2026-01-01').data.dueText).toBe('2026 年 10 月 10 日')
    expect(dueDateInfo('2026-01-01', 26, '2026-01-01').data.dueText).toBe('2026 年 10 月 6 日')
  })

  it('孕周推进:第 100 天为 14 周 2 天,处于孕中期', () => {
    const r = dueDateInfo('2026-01-01', 28, '2026-04-11') // +100 天
    expect(r.data.passed).toBe(100)
    expect(r.data.week).toBe(14)
    expect(r.data.day).toBe(2)
    expect(r.data.stage).toBe('孕中期(14~27 周)')
  })

  it('产检节点:第 80 天(11 周多)进入 NT 窗口,下一站唐筛', () => {
    const r = dueDateInfo('2026-01-01', 28, '2026-03-22') // +80 天 = 11 周 3 天
    expect(r.data.currentMilestones.some((ms) => ms.label.includes('NT'))).toBe(true)
    expect(r.data.nextMilestone?.label).toContain('唐氏筛查')
  })

  it('孕晚与足月:第 260 天为 37 周 1 天,距预产期 20 天', () => {
    const r = dueDateInfo('2026-01-01', 28, '2026-09-18') // +260 天
    expect(r.data.week).toBe(37)
    expect(r.data.day).toBe(1)
    expect(r.data.remain).toBe(20)
    expect(r.data.born).toBe(false)
    expect(r.data.currentMilestones.some((ms) => ms.label.includes('每周一次'))).toBe(true)
  })

  it('预产期过后 born 置位、孕周封顶 40', () => {
    const r = dueDateInfo('2026-01-01', 28, '2026-10-20') // +292 天
    expect(r.data.born).toBe(true)
    expect(r.data.week).toBe(40)
    expect(r.data.remain).toBeLessThanOrEqual(0)
  })

  it('进度条百分比', () => {
    const r = dueDateInfo('2026-01-01', 28, '2026-07-11') // +191 天
    expect(r.data.passed).toBe(191)
    expect(r.data.progress).toBe(Math.round((191 / 280) * 100)) // 68
  })
})

describe('dueDate · 入参校验', () => {
  it('空日期、不存在的日期、未来日期、越界周期都报错', () => {
    expect(dueDateInfo('', 28, '2026-01-01').error).toBeTruthy()
    expect(dueDateInfo('2026-02-30', 28, '2026-03-05').error).toBeTruthy()
    expect(dueDateInfo('2026-06-01', 28, '2026-01-01').error).toBeTruthy()
    expect(dueDateInfo('2026-01-01', 10, '2026-01-01').error).toBeTruthy()
    expect(dueDateInfo('2026-01-01', 90, '2026-01-01').error).toBeTruthy()
  })
})
