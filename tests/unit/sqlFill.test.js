import { describe, expect, it } from 'vitest'
import { fillSqlParams } from '@/utils/sqlFill'

describe('sqlFill · ? 占位符', () => {
  it('字符串 / 数字 / null / 布尔各自就位', () => {
    const r = fillSqlParams('SELECT * FROM t WHERE id = ? AND name = ? AND del = ? AND flag = ?', [42, '张三', null, true])
    expect(r.ok).toBe(true)
    expect(r.text).toBe("SELECT * FROM t WHERE id = 42 AND name = '张三' AND del = NULL AND flag = TRUE")
    expect(r.used).toBe(4)
  })

  it("字符串里的 ' 转义为 ''", () => {
    const r = fillSqlParams('SELECT ? ', ["O'Brien"])
    expect(r.text).toBe("SELECT 'O''Brien' ")
  })

  it('SQL 字符串字面量里的 ? 不当作参数', () => {
    const r = fillSqlParams("SELECT 'a?b' FROM t WHERE x = ?", ['v'])
    expect(r.text).toBe("SELECT 'a?b' FROM t WHERE x = 'v'")
    expect(r.used).toBe(1)
  })

  it('行注释里的 ? 忽略', () => {
    const r = fillSqlParams('SELECT 1 -- comment ?\n, x = ?', ['v'])
    expect(r.text).toBe('SELECT 1 -- comment ?\n, x = \'v\'')
  })

  it('数量不匹配报错', () => {
    expect(fillSqlParams('SELECT ? ?', ['a']).error).toContain('多')
    expect(fillSqlParams('SELECT ?', ['a', 'b']).error).toContain('多')
    expect(fillSqlParams('SELECT ? ?', ['a', 'b', 'c']).error).toContain('还有 1 个')
  })

  it('mysqlBackslash 模式转义反斜杠与引号', () => {
    const r = fillSqlParams('SELECT ?', ["a'b\\c"], { mysqlBackslash: true })
    // MySQL 字面量:a'b\c → 'a\'b\\c'
    expect(r.text).toBe("SELECT 'a\\'b\\\\c'")
  })
})

describe('sqlFill · $n 占位符(PostgreSQL)', () => {
  it('$1 $2 按序号取参', () => {
    const r = fillSqlParams('SELECT * FROM t WHERE a = $2 AND b = $1', ['first', 'second'])
    expect(r.text).toBe("SELECT * FROM t WHERE a = 'second' AND b = 'first'")
  })

  it('$n 超界报错', () => {
    expect(fillSqlParams('SELECT $3', ['a']).error).toContain('$3')
  })
})

describe('sqlFill · 边界', () => {
  it('数字 NaN 输出 NULL,Date 输出时间戳字面量', () => {
    const r = fillSqlParams('VALUES (?, ?, ?)', [NaN, new Date('2026-10-07T08:09:10.120Z'), 0])
    expect(r.text).toBe("VALUES (NULL, '2026-10-07 08:09:10.120', 0)")
  })

  it('没有占位符时原样返回', () => {
    expect(fillSqlParams('SELECT 1', []).text).toBe('SELECT 1')
  })
})
