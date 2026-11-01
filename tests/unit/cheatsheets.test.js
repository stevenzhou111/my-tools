import { describe, expect, it } from 'vitest'
import { HEADER_GROUPS, allHeaders, DIR_LABEL } from '@/utils/httpHeaders'
import { PORT_GROUPS, allPorts } from '@/utils/ports'

describe('httpHeaders · 数据完整性', () => {
  const ALL = allHeaders()

  it('头名唯一且格式合法', () => {
    const names = ALL.map((h) => h.name)
    expect(new Set(names).size).toBe(names.length)
    for (const h of ALL) expect(h.name).toMatch(/^[A-Za-z-]+$/)
  })

  it('方向字段与分组合法', () => {
    for (const h of ALL) {
      expect(['req', 'res', 'both'], h.name).toContain(h.dir)
      expect(DIR_LABEL[h.dir]).toBeTruthy()
    }
    for (const g of HEADER_GROUPS) expect(g.items.length).toBeGreaterThan(0)
  })

  it('关键条目齐全', () => {
    const get = (n) => ALL.find((h) => h.name === n)
    expect(get('Authorization').desc).toContain('Bearer')
    expect(get('Content-Type')).toBeTruthy()
    expect(get('Access-Control-Allow-Origin').groupId).toBe('cors')
    expect(get('Strict-Transport-Security').groupId).toBe('security')
    expect(get('Cache-Control').dir).toBe('both')
  })
})

describe('ports · 数据完整性', () => {
  const ALL = allPorts()

  it('端口号在 1~65535 且组内唯一', () => {
    for (const p of ALL) {
      expect(p.port, p.name).toBeGreaterThanOrEqual(1)
      expect(p.port).toBeLessThanOrEqual(65535)
      expect(Number.isInteger(p.port)).toBe(true)
    }
    for (const g of PORT_GROUPS) {
      const nums = g.items.map((i) => i.port)
      expect(new Set(nums).size, g.id).toBe(nums.length)
    }
  })

  it('协议只含 TCP/UDP 组合', () => {
    for (const p of ALL) expect(p.proto).toMatch(/^(TCP|UDP|TCP\/UDP)$/)
  })

  it('知名端口锚点', () => {
    const get = (port, name) => ALL.find((p) => p.port === port && p.name.includes(name))
    expect(get(443, 'HTTPS')).toBeTruthy()
    expect(get(22, 'SSH')).toBeTruthy()
    expect(get(3306, 'MySQL')).toBeTruthy()
    expect(get(6379, 'Redis')).toBeTruthy()
    expect(get(53, 'DNS')).toBeTruthy()
  })
})
