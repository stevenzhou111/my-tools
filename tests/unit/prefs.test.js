import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { MAX_RECENTS } from '@/utils/prefs'

// prefs 是模块级单例,每个用例都要拿到全新的实例
async function freshPrefs() {
  vi.resetModules()
  return import('@/utils/prefs')
}

beforeEach(() => {
  localStorage.clear()
})

describe('prefs · 收藏', () => {
  it('初始为空', async () => {
    const { useToolPrefs } = await freshPrefs()
    const { favorites, isFav } = useToolPrefs()
    expect(favorites.value).toEqual([])
    expect(isFav('json')).toBe(false)
  })

  it('切换收藏:加进去再拿出来', async () => {
    const { useToolPrefs } = await freshPrefs()
    const { favorites, isFav, toggleFav } = useToolPrefs()

    toggleFav('json')
    await nextTick()
    expect(isFav('json')).toBe(true)
    expect(favorites.value).toEqual(['json'])

    toggleFav('json')
    await nextTick()
    expect(isFav('json')).toBe(false)
    expect(favorites.value).toEqual([])
  })

  it('新收藏排在最前', async () => {
    const { useToolPrefs } = await freshPrefs()
    const { favorites, toggleFav } = useToolPrefs()
    toggleFav('a')
    toggleFav('b')
    toggleFav('c')
    await nextTick()
    expect(favorites.value).toEqual(['c', 'b', 'a'])
  })

  it('写入 localStorage 并能被新实例读回', async () => {
    const { useToolPrefs } = await freshPrefs()
    useToolPrefs().toggleFav('uuid')
    await nextTick()

    const reloaded = await freshPrefs()
    expect(reloaded.useToolPrefs().favorites.value).toEqual(['uuid'])
  })
})

describe('prefs · 最近使用', () => {
  it('重复进入会置顶而不是重复堆积', async () => {
    const { useToolPrefs } = await freshPrefs()
    const { recents, pushRecent } = useToolPrefs()

    pushRecent('a')
    pushRecent('b')
    pushRecent('a')
    await nextTick()

    expect(recents.value).toEqual(['a', 'b'])
  })

  it(`最多保留 ${MAX_RECENTS} 条`, async () => {
    const { useToolPrefs } = await freshPrefs()
    const { recents, pushRecent } = useToolPrefs()

    for (let i = 0; i < MAX_RECENTS + 10; i++) pushRecent(`tool-${i}`)
    await nextTick()

    expect(recents.value).toHaveLength(MAX_RECENTS)
    expect(recents.value[0]).toBe(`tool-${MAX_RECENTS + 9}`)
  })
})

describe('prefs · 异常数据', () => {
  it('localStorage 里的非数组 JSON 被安全忽略', async () => {
    localStorage.setItem('toolbox-favorites', '{"a":1}')
    const { useToolPrefs } = await freshPrefs()
    expect(useToolPrefs().favorites.value).toEqual([])
  })

  it('数组里的非字符串项被过滤掉', async () => {
    localStorage.setItem('toolbox-favorites', '["json", 42, null, "base64"]')
    const { useToolPrefs } = await freshPrefs()
    expect(useToolPrefs().favorites.value).toEqual(['json', 'base64'])
  })

  it('损坏的 JSON 不会让应用崩溃', async () => {
    localStorage.setItem('toolbox-recents', '{坏掉的 json')
    const { useToolPrefs } = await freshPrefs()
    expect(useToolPrefs().recents.value).toEqual([])
  })

  it('存储写入失败(如隐私模式)不影响收藏操作本身', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    const { useToolPrefs } = await freshPrefs()
    const { isFav, toggleFav } = useToolPrefs()

    expect(() => toggleFav('json')).not.toThrow()
    await nextTick()
    expect(isFav('json')).toBe(true)
    setItem.mockRestore()
  })
})