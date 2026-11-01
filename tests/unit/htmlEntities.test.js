import { describe, expect, it } from 'vitest'
import { ENTITY_GROUPS, allEntities } from '@/utils/htmlEntities'

const ALL = allEntities()

describe('htmlEntities · 数据完整性', () => {
  it('实体名与写法唯一', () => {
    const names = ALL.map((e) => e.name)
    const entities = ALL.map((e) => e.entity)
    expect(new Set(names).size).toBe(names.length)
    expect(new Set(entities).size).toBe(entities.length)
  })

  it('实体写法格式合法(&name;)', () => {
    for (const e of ALL) {
      expect(e.entity, e.name).toMatch(/^&[a-zA-Z0-9]+;$/)
      expect(e.char.length).toBeLessThanOrEqual(2)
    }
  })

  it('关键条目:必转义与常见符号', () => {
    const get = (entity) => ALL.find((e) => e.entity === entity)
    expect(get('&amp;').char).toBe('&')
    expect(get('&lt;').char).toBe('<')
    expect(get('&gt;').char).toBe('>')
    expect(get('&quot;').char).toBe('"')
    expect(get('&nbsp;').char).toBe(' ')
    expect(get('&copy;').char).toBe('©')
    expect(get('&hellip;').char).toBe('…')
    expect(get('&infin;').char).toBe('∞')
    expect(get('&alpha;').char).toBe('α')
  })

  it('分组齐全且每组非空', () => {
    const ids = ENTITY_GROUPS.map((g) => g.id)
    expect(ids).toContain('basic')
    expect(ids).toContain('math')
    expect(ids).toContain('greek')
    for (const g of ENTITY_GROUPS) expect(g.items.length).toBeGreaterThan(0)
  })
})
