import { describe, expect, it } from 'vitest'
import { parseTable, toMarkdown, ALIGN_OPTIONS } from '@/utils/mdTable'

describe('mdTable · 解析', () => {
  it('Tab 分隔优先(Excel 直接粘贴)', () => {
    const { rows, delim, error } = parseTable('姓名\t部门\t月薪\n张三\t研发部\t25000')
    expect(error).toBe('')
    expect(delim).toBe('\t')
    expect(rows).toEqual([
      ['姓名', '部门', '月薪'],
      ['张三', '研发部', '25000'],
    ])
  })

  it('CSV 带引号:单元格内的逗号、双引号、换行不切错', () => {
    const { rows, delim } = parseTable('name,note\n"张三,三","会""报错""吗"\n"李四","多行\n单元格"')
    expect(delim).toBe(',')
    expect(rows).toEqual([
      ['name', 'note'],
      ['张三,三', '会"报错"吗'],
      ['李四', '多行\n单元格'],
    ])
  })

  it('竖线分隔按 Markdown 行处理,跳过 |---| 分隔行', () => {
    const { rows } = parseTable('| a | b |\n| --- | --- |\n| 1 | 2 |')
    expect(rows).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('没有分隔符时整行作为单列,并给出提示', () => {
    const r = parseTable('第一行\n第二行')
    expect(r.rows).toEqual([['第一行'], ['第二行']])
    expect(r.error).toContain('分隔符')
  })

  it('空输入返回空结果不报错', () => {
    const r = parseTable('  \n \n')
    expect(r.rows).toEqual([])
    expect(r.error).toBe('')
  })
})

describe('mdTable · 渲染', () => {
  it('基础渲染:表头 + 分隔行 + 数据行', () => {
    const md = toMarkdown([['姓名', '部门'], ['张三', '研发部']])
    expect(md).toBe('| 姓名 | 部门 |\n| --- | --- |\n| 张三 | 研发部 |')
  })

  it('列数不齐自动补空单元格', () => {
    const md = toMarkdown([['a', 'b', 'c'], ['1']])
    expect(md.split('\n')[2]).toBe('| 1 |  |  |')
  })

  it('单元格内的竖线转义、换行转 <br>', () => {
    const md = toMarkdown([['表达式'], ['a | b\n换行']])
    expect(md).toContain('a \\| b<br>换行')
  })

  it('对齐标记按列输出', () => {
    const md = toMarkdown([['a', 'b', 'c'], ['1', '2', '3']], ['left', 'center', 'right'])
    expect(md.split('\n')[1]).toBe('| :--- | :---: | ---: |')
  })

  it('不设置对齐时输出默认 ---', () => {
    const md = toMarkdown([['a'], ['1']])
    expect(md.split('\n')[1]).toBe('| --- |')
  })

  it('关闭表头后首行前插入空表头', () => {
    // 组件里 headerOn=false 时以 [''] 补一个空表头行
    const rows = [[''], ...[['数据']]]
    const md = toMarkdown(rows)
    expect(md.split('\n')[0]).toBe('|  |')
    expect(md.split('\n')[2]).toBe('| 数据 |')
  })

  it('ALIGN_OPTIONS id 与 token 一一对应', () => {
    expect(ALIGN_OPTIONS.map((a) => a.id)).toEqual(['none', 'left', 'center', 'right'])
    expect(ALIGN_OPTIONS.find((a) => a.id === 'center').token).toBe(':---:')
  })
})
