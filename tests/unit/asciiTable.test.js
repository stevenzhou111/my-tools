import { describe, expect, it } from 'vitest'
import { asciiTable, filterRows } from '@/utils/asciiTable'

const ROWS = asciiTable()

describe('asciiTable · 数据完整性', () => {
  it('覆盖 0~127 共 128 行,各进制自洽', () => {
    expect(ROWS).toHaveLength(128)
    for (const r of ROWS) {
      expect(parseInt(r.hex, 16)).toBe(r.dec)
      expect(parseInt(r.oct, 8)).toBe(r.dec)
      expect(parseInt(r.bin, 2)).toBe(r.dec)
      expect(r.hex).toHaveLength(2)
      expect(r.bin).toHaveLength(8)
    }
  })

  it('关键锚点字符', () => {
    expect(ROWS[65].char).toBe('A')
    expect(ROWS[97].char).toBe('a')
    expect(ROWS[48].char).toBe('0')
    expect(ROWS[32].char).toBe(' ')
    expect(ROWS[32].abbr).toBe('SP')
  })

  it('控制字符:缩写、转义与中文名', () => {
    expect(ROWS[0]).toMatchObject({ abbr: 'NUL', esc: '\\0', name: '空字符' })
    expect(ROWS[10]).toMatchObject({ abbr: 'LF', esc: '\\n', name: '换行' })
    expect(ROWS[13]).toMatchObject({ abbr: 'CR', esc: '\\r', name: '回车' })
    expect(ROWS[9]).toMatchObject({ abbr: 'HT', esc: '\\t' })
    expect(ROWS[27]).toMatchObject({ abbr: 'ESC', esc: '\\e' })
    expect(ROWS[127]).toMatchObject({ abbr: 'DEL' })
  })

  it('分类字段正确', () => {
    expect(ROWS[65].type).toBe('upper')
    expect(ROWS[97].type).toBe('lower')
    expect(ROWS[48].type).toBe('digit')
    expect(ROWS[10].type).toBe('ctrl')
    expect(ROWS[33].type).toBe('punct') // !
  })
})

describe('asciiTable · filterRows', () => {
  it('all 返回全量,分类过滤数量正确', () => {
    expect(filterRows(ROWS, 'all')).toHaveLength(128)
    expect(filterRows(ROWS, 'upper')).toHaveLength(26)
    expect(filterRows(ROWS, 'lower')).toHaveLength(26)
    expect(filterRows(ROWS, 'digit')).toHaveLength(10)
    expect(filterRows(ROWS, 'ctrl')).toHaveLength(33) // 0~31 + 127
  })
})
