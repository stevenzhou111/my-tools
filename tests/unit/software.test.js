import { describe, expect, it } from 'vitest'
import { SOFT_CATS, SOFTWARE } from '@/data/software'
import { ICONS } from '@/assets/icons'

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u
const ALLOWED_TAGS = ['免费', '免费+开源', '开源', '个人免费', '社区版免费', '基础免费', '系统内置', '网页', '付费']

describe('软件推荐 · 分类', () => {
  it('分类 id 唯一', () => {
    const ids = SOFT_CATS.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('分类图标均为已生成的 SVG 图标且无 emoji', () => {
    for (const c of SOFT_CATS) {
      expect(ICONS[c.icon], `软件分类 ${c.id} 的图标 ${c.icon} 缺失`).toBeTypeOf('object')
      expect(c.icon, `软件分类 ${c.id}`).not.toMatch(EMOJI)
    }
  })

  it('每个分类下都有软件', () => {
    for (const c of SOFT_CATS) {
      const n = SOFTWARE.filter((s) => s.cat === c.id).length
      expect(n, `软件分类 ${c.id} 是空的`).toBeGreaterThan(0)
    }
  })
})

describe('软件推荐 · 条目', () => {
  it('每条都有名称、描述、平台与标签', () => {
    for (const s of SOFTWARE) {
      expect(s.name?.trim(), `软件 ${s.name} 缺少名称`).not.toBe('')
      expect(s.desc?.trim(), `${s.name} 缺少描述`).not.toBe('')
      expect(s.platform?.trim(), `${s.name} 缺少平台`).not.toBe('')
      expect(s.tag?.trim(), `${s.name} 缺少标签`).not.toBe('')
    }
  })

  it('每条都挂在已存在的分类下', () => {
    const ids = new Set(SOFT_CATS.map((c) => c.id))
    for (const s of SOFTWARE) {
      expect(ids.has(s.cat), `${s.name} 的分类 ${s.cat} 不存在`).toBe(true)
    }
  })

  it('官网地址为合法 https 链接', () => {
    for (const s of SOFTWARE) {
      expect(s.site, `${s.name} 缺少官网地址`).toBeTruthy()
      let u
      try {
        u = new URL(s.site)
      } catch {
        throw new Error(`${s.name} 的官网地址不是合法 URL:${s.site}`)
      }
      expect(u.protocol, `${s.name} 的官网必须用 https(当前 ${u.protocol})`).toBe('https:')
      expect(u.hostname, `${s.name} 的官网缺少域名`).toContain('.')
    }
  })

  it('标签取自约定的集合', () => {
    for (const s of SOFTWARE) {
      expect(ALLOWED_TAGS, `${s.name} 的标签「${s.tag}」不在约定集合内`).toContain(s.tag)
    }
  })

  it('软件名称不重复', () => {
    const names = SOFTWARE.map((s) => s.name)
    const dup = names.filter((n, i) => names.indexOf(n) !== i)
    expect(dup, `重复的软件:${[...new Set(dup)].join('、')}`).toEqual([])
  })

  it('没有遗留的占位文案', () => {
    const PLACEHOLDER = /待补充|待定|TODO|FIXME|xxx|待更新|暂无/i
    for (const s of SOFTWARE) {
      expect(`${s.name}${s.desc}${s.site}`, `${s.name} 含有占位文案`).not.toMatch(PLACEHOLDER)
    }
  })

  it('适用人群标注若有则应为短句', () => {
    for (const s of SOFTWARE) {
      if (s.aud === undefined) continue
      expect(s.aud.trim(), `${s.name} 的适用人群为空`).not.toBe('')
      expect(s.aud.length, `${s.name} 的适用人群过长`).toBeLessThanOrEqual(30)
    }
  })

  it('条目数量保持在两位数以上', () => {
    expect(SOFTWARE.length).toBeGreaterThanOrEqual(100)
  })
})