import { describe, expect, it } from 'vitest'
import { buildInserts, sqlLiteral } from '@/utils/xlsxSql'

const data = {
  headers: ['id', 'name', 'age', 'note'],
  rows: [
    [1, '张三', 25, ''],
    [2, "O'Brien", null, '备注'],
  ],
}

describe('xlsxSql · sqlLiteral', () => {
  it('各类型字面量', () => {
    expect(sqlLiteral(1)).toBe('1')
    expect(sqlLiteral('张三')).toBe("'张三'")
    expect(sqlLiteral("O'Brien")).toBe("'O''Brien'")
    expect(sqlLiteral(null)).toBe('NULL')
    expect(sqlLiteral('')).toBe('NULL')
    expect(sqlLiteral('', { emptyAsNull: false })).toBe("''")
    expect(sqlLiteral(true)).toBe('TRUE')
    expect(sqlLiteral(NaN)).toBe('NULL')
    expect(sqlLiteral(new Date('2026-10-07T08:09:10Z'))).toBe("'2026-10-07 08:09:10'")
  })
})

describe('xlsxSql · buildInserts', () => {
  it('batch 模式:一条语句多行 VALUES', () => {
    const r = buildInserts(data, { table: 'users' })
    expect(r.ok).toBe(true)
    expect(r.count).toBe(2)
    expect(r.text).toBe(
      [
        'INSERT INTO `users` (`id`, `name`, `age`, `note`) VALUES',
        "  (1, '张三', 25, NULL),",
        "  (2, 'O''Brien', NULL, '备注');",
      ].join('\n'),
    )
  })

  it('postgres 方言用双引号', () => {
    const r = buildInserts(data, { table: 'users', dialect: 'postgres', mode: 'rows' })
    expect(r.text).toContain('INSERT INTO "users" ("id"')
    expect(r.text.match(/INSERT INTO/g)).toHaveLength(2)
  })

  it('batchSize 分条', () => {
    const big = { headers: ['id'], rows: Array.from({ length: 250 }, (_, i) => [i + 1]) }
    const r = buildInserts(big, { table: 't', batchSize: 100 })
    expect(r.text.match(/INSERT INTO/g)).toHaveLength(3)
    expect(r.count).toBe(250)
  })

  it('错误情形', () => {
    expect(buildInserts(data, { table: '' }).error).toContain('表名')
    expect(buildInserts({ headers: ['a'], rows: [] }).error).toContain('没有数据行')
    expect(buildInserts({ headers: [], rows: [[1]] }).error).toContain('表头')
  })
})
