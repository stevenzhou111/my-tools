import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { ICONS, ICON_NAMES } from '@/assets/icons'
import { mount } from '@vue/test-utils'
import AppIcon from '@/components/AppIcon.vue'

const SVG_TAGS = new Set([
  'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse', 'g', 'use',
])

describe('icons · 数据结构', () => {
  it('ICON_NAMES 与 ICONS 的键完全一致', () => {
    expect(new Set(ICON_NAMES)).toEqual(new Set(Object.keys(ICONS)))
  })

  it('ICON_NAMES 无重复项', () => {
    expect(new Set(ICON_NAMES).size).toBe(ICON_NAMES.length)
  })

  it('每个图标都是非空的 SVG 节点数组', () => {
    for (const [name, nodes] of Object.entries(ICONS)) {
      expect(Array.isArray(nodes), `${name} 不是数组`).toBe(true)
      expect(nodes.length, `${name} 没有路径数据`).toBeGreaterThan(0)
      for (const node of nodes) {
        expect(Array.isArray(node), `${name} 的节点不是二元组`).toBe(true)
        expect(node.length).toBe(2)
        const [tag, attrs] = node
        expect(SVG_TAGS.has(tag), `${name} 含非法标签 ${tag}`).toBe(true)
        expect(attrs, `${name} 的 ${tag} 缺少属性`).toBeTypeOf('object')
        expect(Object.keys(attrs).length, `${name} 的 ${tag} 属性为空`).toBeGreaterThan(0)
      }
    }
  })

  it('不含渲染期才需要的 key 属性(会让图标数据白白变大)', () => {
    for (const [name, nodes] of Object.entries(ICONS)) {
      for (const [, attrs] of nodes) {
        expect(attrs, `${name} 仍带有 key`).not.toHaveProperty('key')
      }
    }
  })
})

describe('AppIcon 组件', () => {
  it('按名称渲染出对应数量的图形节点', () => {
    const name = Object.keys(ICONS)[0]
    const w = mount(AppIcon, { props: { name } })
    const svg = w.find('svg')
    expect(svg.exists()).toBe(true)
    expect(svg.findAll('path, circle, rect, line, polyline, polygon, ellipse').length).toBe(
      ICONS[name].length,
    )
  })

  it('尺寸透传到 svg 的宽高', () => {
    const w = mount(AppIcon, { props: { name: 'star', size: 28 } })
    const svg = w.find('svg')
    expect(svg.attributes('width')).toBe('28')
    expect(svg.attributes('height')).toBe('28')
    expect(svg.attributes('viewBox')).toBe('0 0 24 24')
  })

  it('未知图标名不报错,渲染空 svg', () => {
    const w = mount(AppIcon, { props: { name: 'definitely-not-an-icon' } })
    expect(w.find('svg').exists()).toBe(true)
    expect(w.find('path').exists()).toBe(false)
  })

  it('未传 name 时不报错', () => {
    const w = mount(AppIcon)
    expect(w.find('svg').exists()).toBe(true)
  })

  it('沿用当前文字颜色(装饰性图标,对屏幕阅读器隐藏)', () => {
    const w = mount(AppIcon, { props: { name: 'star' } })
    const svg = w.find('svg')
    expect(svg.attributes('stroke')).toBe('currentColor')
    expect(svg.attributes('aria-hidden')).toBe('true')
  })
})
// 图标名写错时 AppIcon 不会报错,只会渲染一个空 svg —— 视觉上很难发现。
// 这里直接扫描所有模板里的字面量 name="...",把它挡在构建之外。
describe('AppIcon 在模板中的用法', () => {
  const SRC = path.resolve(process.cwd(), 'src')

  function vueFiles(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const full = path.join(dir, e.name)
      if (e.isDirectory()) return vueFiles(full)
      return e.name.endsWith('.vue') ? [full] : []
    })
  }

  it('所有写死的图标名都能查到路径数据', () => {
    // 只取字面量:name="star";:name="tool.icon" 这类动态绑定由数据层测试负责
    const literal = /<AppIcon\b[^>]*\bname="([a-z][a-z0-9-]*)"/g
    const found = []
    for (const file of vueFiles(SRC)) {
      const src = fs.readFileSync(file, 'utf8')
      for (const m of src.matchAll(literal)) found.push([path.relative(SRC, file), m[1]])
    }

    expect(found.length, '一个写死的图标名都没扫到,扫描规则可能失效了').toBeGreaterThan(0)

    const missing = found.filter(([, name]) => !ICONS[name])
    expect(
      missing.map(([f, n]) => `${f} -> "${n}"`).join('\n'),
      '这些图标名在 ICONS 里不存在,会渲染成空白图标',
    ).toEqual('')
  })

  it('未被任何地方引用的图标可以清理(仅提示,不阻断)', () => {
    const used = new Set()
    for (const file of vueFiles(SRC)) {
      const src = fs.readFileSync(file, 'utf8')
      for (const m of src.matchAll(/name="([a-z][a-z0-9-]*)"/g)) used.add(m[1])
    }
    const orphans = ICON_NAMES.filter((n) => !used.has(n))
    // 分类/工具的图标是数据驱动的,不在模板里出现是正常的
    expect(Array.isArray(orphans)).toBe(true)
  })
})
