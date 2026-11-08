import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { MAX_RECENTS } from '@/utils/prefs'
import { TOOLS } from '@/tools/registry'

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
describe('prefs · 导出与导入', () => {
  it('导出包含收藏与最近使用,JSON 可解析', async () => {
    const { useToolPrefs } = await freshPrefs()
    const { toggleFav, pushRecent, exportPrefs } = useToolPrefs()
    toggleFav('json')
    toggleFav('qrcode')
    pushRecent('timestamp')
    const data = JSON.parse(exportPrefs())
    expect(data.favorites).toEqual(['qrcode', 'json'])
    expect(data.recents).toEqual(['timestamp'])
  })

  it('导入合并到现有数据之前,去重', async () => {
    const { useToolPrefs } = await freshPrefs()
    const { toggleFav, importPrefs, favorites } = useToolPrefs()
    toggleFav('json') // 现有:json
    const r = importPrefs(JSON.stringify({ favorites: ['qrcode', 'timestamp', 'json'] }))
    // 导入的排前面,json 去重只留一份
    expect(favorites.value).toEqual(['qrcode', 'timestamp', 'json'])
    expect(r.added).toBe(2)
  })

  it('已下线工具的 id 被静默丢弃', async () => {
    const { useToolPrefs } = await freshPrefs()
    const { importPrefs, favorites, exportPrefs } = useToolPrefs()
    const r = importPrefs(JSON.stringify({ favorites: ['json', '__gone__'], recents: ['__gone2__'] }))
    expect(favorites.value).toEqual(['json'])
    expect(r.importedFavs).toBe(1)
    expect(r.importedRecents).toBe(0)
    // 导出的内容也不再含已下线 id
    expect(exportPrefs()).not.toContain('__gone__')
  })

  it('非法内容抛出可读错误', async () => {
    const { useToolPrefs } = await freshPrefs()
    const { importPrefs } = useToolPrefs()
    expect(() => importPrefs('not-json')).toThrow('JSON')
    expect(() => importPrefs(JSON.stringify({ foo: 1 }))).toThrow('favorites')
    expect(() => importPrefs('')).toThrow()
  })

  it('导入的最近使用与现有合并且封顶', async () => {
    const { useToolPrefs } = await freshPrefs()
    const { importPrefs, recents } = useToolPrefs()
    const many = TOOLS.slice(0, 12).map((t) => t.id) // 必须是真实存在的工具 id
    importPrefs(JSON.stringify({ favorites: [], recents: many }))
    expect(recents.value.length).toBeLessThanOrEqual(8)
    expect(recents.value[0]).toBe(TOOLS[0].id)
  })
})

describe('prefs · 清空最近使用', () => {
  it('只清最近,收藏保留', async () => {
    const { useToolPrefs } = await freshPrefs()
    const { toggleFav, pushRecent, clearRecents, recents, favorites } = useToolPrefs()
    toggleFav('json')
    pushRecent('qrcode')
    clearRecents()
    expect(recents.value).toEqual([])
    expect(favorites.value).toEqual(['json'])
  })
})

describe('prefs · 工具本机数据(useAppData)与迁移', () => {
  it('未登记的键直接抛错(防止散乱键名失控)', async () => {
    const { useAppData } = await freshPrefs()
    expect(() => useAppData('some-random-key', [])).toThrow('未登记')
  })

  it('从 localStorage 恢复已有数据;损坏数据回退默认值', async () => {
    localStorage.setItem('toolbox-countdown-days', '[{"id":1}]')
    localStorage.setItem('toolbox-metronome', '{坏')
    const { useAppData } = await freshPrefs()
    expect(useAppData('toolbox-countdown-days', []).value).toEqual([{ id: 1 }])
    expect(useAppData('toolbox-metronome', { bpm: 96 }).value).toEqual({ bpm: 96 })
  })

  it('同一键重复调用返回同一个 ref;变更自动写回 localStorage', async () => {
    const { useAppData } = await freshPrefs()
    const a = useAppData('toolbox-countdown-days', [])
    expect(a).toBe(useAppData('toolbox-countdown-days', []))
    a.value = [{ id: 'x' }]
    await nextTick()
    expect(JSON.parse(localStorage.getItem('toolbox-countdown-days'))).toEqual([{ id: 'x' }])
  })

  it('导出包含已初始化的工具数据;导入按「数组合并去重 / 对象覆盖」归并', async () => {
    const { useAppData, useToolPrefs } = await freshPrefs()
    useAppData('toolbox-countdown-days', []).value = [{ id: 'local' }]
    useAppData('toolbox-typing-best', null).value = { cn: 100, en: 40 }
    const data = JSON.parse(useToolPrefs().exportPrefs())
    expect(data.version).toBe(2)
    expect(data.states['toolbox-countdown-days']).toEqual([{ id: 'local' }])

    const r = useToolPrefs().importPrefs(JSON.stringify({
      favorites: [],
      states: {
        'toolbox-countdown-days': [{ id: 'imported' }, { id: 'local' }], // 数组:导入排前、去重
        'toolbox-typing-best': { cn: 200, en: 60 }, // 对象:整体覆盖
      },
    }))
    expect(r.importedStates).toBe(2)
    expect(useAppData('toolbox-countdown-days', []).value).toEqual([{ id: 'imported' }, { id: 'local' }])
    expect(useAppData('toolbox-typing-best', null).value).toEqual({ cn: 200, en: 60 })
  })

  it('工具未初始化时导入直接落盘,新实例(首次打开工具)可读到', async () => {
    const { useToolPrefs } = await freshPrefs()
    const r = useToolPrefs().importPrefs(JSON.stringify({
      favorites: [],
      states: { 'toolbox-sci-calc-history': [{ expr: '1+1', res: '2' }] },
    }))
    expect(r.importedStates).toBe(1)

    const reloaded = await freshPrefs()
    expect(reloaded.useAppData('toolbox-sci-calc-history', []).value).toEqual([{ expr: '1+1', res: '2' }])
  })

  it('导入的 states 忽略未登记的键与标量值', async () => {
    const { useToolPrefs } = await freshPrefs()
    const r = useToolPrefs().importPrefs(JSON.stringify({
      favorites: [],
      states: { 'not-registered': [1], 'toolbox-countdown-days': 'corrupted' },
    }))
    expect(r.importedStates).toBe(0)
    expect(localStorage.getItem('toolbox-countdown-days')).toBeNull()
  })

  it('旧版导出文件(无 states 字段)导入不受影响', async () => {
    const { useToolPrefs } = await freshPrefs()
    const r = useToolPrefs().importPrefs(JSON.stringify({ favorites: ['json'], recents: [] }))
    expect(r.added).toBe(1)
    expect(r.importedStates).toBe(0)
  })
})
