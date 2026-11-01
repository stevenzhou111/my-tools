import { describe, expect, it } from 'vitest'
import { toMarkdown, fromMarkdownTable, rowsToTsv, rowsToCsv, rowsToJson } from '@/utils/mdTable'

describe('mdTable · 反向解析(fromMarkdownTable)', () => {
  it('基础解析:表头 + 数据行,对齐行跳过', () => {
    const md = ['| 姓名 | 部门 |', '| --- | --- |', '| 张三 | 研发部 |', '| :---: | ---: |', '| 李四 | 市场部 |'].join('\n')
    const { rows, error } = fromMarkdownTable(md)
    expect(error).toBe('')
    expect(rows).toEqual([
      ['姓名', '部门'],
      ['张三', '研发部'],
      ['李四', '市场部'],
    ])
  })

  it('还原 \\| 转义与 <br>', () => {
    const md = ['| a | b |', '| --- | --- |', '| x \\| y | 1<br>2 |'].join('\n')
    const { rows } = fromMarkdownTable(md)
    expect(rows[1]).toEqual(['x | y', '1\n2'])
  })

  it('无表格行报错,空输入返回空', () => {
    expect(fromMarkdownTable('普通文本没有竖线').error).toBeTruthy()
    expect(fromMarkdownTable('').rows).toEqual([])
  })
})

describe('mdTable · 行数组输出(rowsTo*)', () => {
  const rows = [
    ['姓名', '备注'],
    ['张三', 'a,b'],
    ['李"四', '多行\n格'],
  ]

  it('TSV:单元格内换行与 Tab 替换为空格,列间仍是 Tab', () => {
    const tsv = rowsToTsv(rows)
    expect(tsv.split('\n')).toHaveLength(3)
    expect(tsv.split('\n')[1]).toBe('张三\ta,b')
    expect(rowsToTsv([['x\ty', 'a\nb']])).toBe('x y\ta b')
  })

  it('CSV:含逗号/引号/换行的单元格加引号并翻倍引号', () => {
    const csv = rowsToCsv(rows)
    expect(csv.split('\n')[0]).toBe('姓名,备注')
    expect(csv.split('\n')[1]).toBe('张三,"a,b"')
    // 引号内含真实换行,不能按行拆断言;整体包含即可
    expect(csv).toContain('"李""四","多行\n格"')
    expect(rowsToCsv([['a', 'b']])).toBe('a,b')
  })

  it('JSON:首行作键,缺列补空串', () => {
    const json = JSON.parse(rowsToJson([['姓名', '备注'], ['张三'], ['李四', 'x']]))
    expect(json[0]).toEqual({ 姓名: '张三', 备注: '' })
    expect(json[1]).toEqual({ 姓名: '李四', 备注: 'x' })
  })

  it('双向往返:toMarkdown 的输出能被 fromMarkdownTable 还原', () => {
    const md = toMarkdown([['a', 'b'], ['1', '2']], ['left', 'right'])
    expect(fromMarkdownTable(md).rows).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })
})
