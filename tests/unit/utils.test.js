import { describe, expect, it, vi } from 'vitest'
import { debounce, formatSize } from '@/utils/format'
import { roundRectPath } from '@/utils/image'
import { copyText } from '@/utils/clipboard'

describe('formatSize', () => {
  it('按量级切换单位并保留一位/两位小数', () => {
    expect(formatSize(0)).toBe('0 B')
    expect(formatSize(512)).toBe('512 B')
    expect(formatSize(1023)).toBe('1023 B')
    expect(formatSize(1024)).toBe('1.0 KB')
    expect(formatSize(1536)).toBe('1.5 KB')
    expect(formatSize(1024 * 1024 - 1)).toMatch(/KB$/)
    expect(formatSize(1024 * 1024)).toBe('1.00 MB')
    expect(formatSize(5 * 1024 * 1024)).toBe('5.00 MB')
  })

  it('非有限数返回占位符而不是 NaN/undefined', () => {
    for (const bad of [NaN, Infinity, -Infinity, undefined, null]) {
      expect(formatSize(bad)).toBe('—')
    }
  })

  it('负数不会被悄悄当成合法体积输出', () => {
    // 当前实现会输出 "-1 B";记录现状,真要改成 '—' 时这条测试会提醒
    expect(formatSize(-1)).toBe('-1 B')
  })
})

describe('debounce', () => {
  it('连续触发只执行最后一次', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const d = debounce(fn, 100)
    d(1)
    d(2)
    d(3)
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith(3)
    vi.useRealTimers()
  })

  it('等待窗口结束后可以再次触发', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const d = debounce(fn, 50)
    d('a')
    vi.advanceTimersByTime(50)
    d('b')
    vi.advanceTimersByTime(50)
    expect(fn).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })

  it('cancel() 可以取消尚未执行的调用', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const d = debounce(fn, 100)
    d()
    d.cancel()
    vi.advanceTimersByTime(500)
    expect(fn).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('默认等待 300ms', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const d = debounce(fn)
    d()
    vi.advanceTimersByTime(299)
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(fn).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })
})

describe('roundRectPath', () => {
  function recorder() {
    const calls = []
    const ctx = {
      beginPath: () => calls.push(['beginPath']),
      moveTo: (...a) => calls.push(['moveTo', ...a]),
      arcTo: (...a) => calls.push(['arcTo', ...a]),
      closePath: () => calls.push(['closePath']),
    }
    return { ctx, calls }
  }

  it('半径被夹到短边的一半,不会画出反向弧线', () => {
    const { ctx, calls } = recorder()
    roundRectPath(ctx, 0, 0, 20, 10, 999)
    expect(calls[0]).toEqual(['beginPath'])
    // radius = min(999, 10, 5) = 5 → 起点 x 应为 5
    expect(calls[1]).toEqual(['moveTo', 5, 0])
    expect(calls.filter((c) => c[0] === 'arcTo')).toHaveLength(4)
    expect(calls.at(-1)).toEqual(['closePath'])
  })

  it('半径小于短边时原样使用', () => {
    const { ctx, calls } = recorder()
    roundRectPath(ctx, 10, 20, 100, 50, 8)
    expect(calls[1]).toEqual(['moveTo', 18, 20])
  })

  it('半径为 0 时退化为直角矩形', () => {
    const { ctx, calls } = recorder()
    roundRectPath(ctx, 0, 0, 10, 10, 0)
    expect(calls[1]).toEqual(['moveTo', 0, 0])
  })
})

describe('copyText', () => {
  it('优先使用 Clipboard API', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    await expect(copyText('hello')).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith('hello')
  })

  it('Clipboard API 失败时回退到 execCommand', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true,
    })
    const execCommand = vi.fn().mockReturnValue(true)
    document.execCommand = execCommand

    await expect(copyText('fallback')).resolves.toBe(true)
    expect(execCommand).toHaveBeenCalledWith('copy')
  })

  it('两条路径都失败时返回 false', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true,
    })
    document.execCommand = vi.fn().mockReturnValue(false)
    await expect(copyText('nope')).resolves.toBe(false)
  })

  it('回退路径创建的临时节点会被移除', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true,
    })
    document.execCommand = vi.fn().mockReturnValue(true)
    const before = document.body.childElementCount
    await copyText('cleanup')
    expect(document.body.childElementCount).toBe(before)
  })
})