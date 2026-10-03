import { describe, expect, it } from 'vitest'
import { CATEGORIES, TOOLS, getTool } from '@/tools/registry'
import { ICONS } from '@/assets/icons'

// emoji 区段,用于守住「图标统一走 SVG」这条约定
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u

describe('registry · 分类', () => {
  it('至少有一个分类', () => {
    expect(CATEGORIES.length).toBeGreaterThan(0)
  })

  it('分类 id 唯一', () => {
    const ids = CATEGORIES.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('分类 id 可安全用作 URL 与选择器', () => {
    for (const c of CATEGORIES) {
      expect(c.id).toMatch(/^[a-z][a-z0-9-]*$/)
    }
  })

  it('分类名称非空', () => {
    for (const c of CATEGORIES) expect(c.name.trim()).not.toBe('')
  })

  it('分类图标均为已生成的 SVG 图标', () => {
    for (const c of CATEGORIES) {
      expect(ICONS[c.icon], `分类 ${c.id} 的图标 ${c.icon} 缺失`).toBeTypeOf('object')
    }
  })

  it('分类不再残留 emoji', () => {
    for (const c of CATEGORIES) expect(c.icon, `分类 ${c.id}`).not.toMatch(EMOJI)
  })

  it('每个分类下至少有一个工具(没有空分类)', () => {
    for (const c of CATEGORIES) {
      const n = TOOLS.filter((t) => t.category === c.id).length
      expect(n, `分类 ${c.id} 是空的`).toBeGreaterThan(0)
    }
  })
})

describe('registry · 工具', () => {
  it('工具数量符合预期', () => {
    expect(TOOLS.length).toBeGreaterThanOrEqual(80)
  })

  it('工具 id 唯一', () => {
    const ids = TOOLS.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('工具 id 可安全用作路由参数', () => {
    for (const t of TOOLS) {
      expect(t.id, `工具 ${t.name} 的 id 不合法`).toMatch(/^[a-z][a-z0-9-]*$/)
    }
  })

  it('每个工具都挂在已存在的分类下', () => {
    const catIds = new Set(CATEGORIES.map((c) => c.id))
    for (const t of TOOLS) {
      expect(catIds.has(t.category), `工具 ${t.id} 的分类 ${t.category} 不存在`).toBe(true)
    }
  })

  it('名称、描述、关键词、关于均非空', () => {
    for (const t of TOOLS) {
      expect(t.name?.trim(), `${t.id} 缺少名称`).not.toBe('')
      expect(t.desc?.trim(), `${t.id} 缺少描述`).not.toBe('')
      expect(t.keywords?.trim(), `${t.id} 缺少关键词(会影响搜索)`).not.toBe('')
      expect(t.about?.trim(), `${t.id} 缺少关于说明`).not.toBe('')
    }
  })

  it('每个工具都绑定了组件', () => {
    for (const t of TOOLS) {
      expect(t.component, `${t.id} 未绑定组件`).toBeTruthy()
    }
  })

  it('工具图标均为已生成的 SVG 图标', () => {
    for (const t of TOOLS) {
      expect(ICONS[t.icon], `工具 ${t.id} 的图标 ${t.icon} 缺失`).toBeTypeOf('object')
    }
  })

  it('工具不再残留 emoji', () => {
    for (const t of TOOLS) expect(t.icon, `工具 ${t.id}`).not.toMatch(EMOJI)
  })

  it('同一分类内工具名称不重复', () => {
    const seen = new Map()
    for (const t of TOOLS) {
      const key = `${t.category}/${t.name}`
      expect(seen.has(key), `重复的工具名:${key}`).toBe(false)
      seen.set(key, true)
    }
  })
})

describe('registry · getTool', () => {
  it('按 id 取到工具', () => {
    expect(getTool('json')?.name).toBe('JSON 格式化')
  })

  it('未知 id 返回 undefined,不抛错', () => {
    expect(getTool('__nope__')).toBeUndefined()
  })

  it('每个工具都能被反查出来', () => {
    for (const t of TOOLS) expect(getTool(t.id)).toBe(t)
  })
})