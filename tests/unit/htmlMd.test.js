import { describe, expect, it } from 'vitest'
import { htmlToMarkdown } from '@/utils/htmlMd'

describe('htmlToMarkdown', () => {
  it('标题转 ATX 风格', () => {
    const { md } = htmlToMarkdown('<h1>标题</h1><h2>小节</h2>')
    expect(md).toContain('# 标题')
    expect(md).toContain('## 小节')
  })

  it('加粗与斜体', () => {
    const { md } = htmlToMarkdown('<p>a <b>粗</b> 和 <i>斜</i></p>')
    expect(md).toContain('**粗**')
    expect(md).toContain('*斜*')
  })

  it('链接与图片', () => {
    const { md } = htmlToMarkdown('<p><a href="https://x.com">链接</a></p><img src="/a.png" alt="图">')
    expect(md).toContain('[链接](https://x.com)')
    expect(md).toContain('![图](/a.png)')
  })

  it('列表', () => {
    const { md } = htmlToMarkdown('<ul><li>一</li><li>二</li></ul>')
    expect(md).toContain('-   一')
    expect(md).toContain('-   二')
  })

  it('围栏代码块', () => {
    const { md } = htmlToMarkdown('<pre><code>const a = 1;</code></pre>')
    expect(md).toContain('```\nconst a = 1;\n```')
  })

  it('空输入返回空结果', () => {
    expect(htmlToMarkdown('')).toEqual({ md: '', error: '' })
  })

  it('普通标签不抛错,输出纯文本', () => {
    const { error, md } = htmlToMarkdown('<div>自定义 <span>标签</span></div>')
    expect(error).toBe('')
    expect(md).toContain('自定义')
    expect(md).toContain('标签')
  })
})
describe('htmlToMarkdown 表格', () => {
  it('转成 GFM 管道表格', () => {
    const { md } = htmlToMarkdown(
      '<table><thead><tr><th>名称</th><th>数量</th></tr></thead><tbody><tr><td>苹果</td><td>3</td></tr></tbody></table>',
    )
    expect(md).toContain('| 名称 | 数量 |')
    expect(md).toContain('| --- | --- |')
    expect(md).toContain('| 苹果 | 3 |')
  })

  it('没有 thead 的表格自动补分隔符(Word 导出的表头也是 td)', () => {
    const { md } = htmlToMarkdown(
      '<table><tr><td><p>名称</p></td><td><p>数量</p></td></tr><tr><td><p>苹果</p></td><td><p>3</p></td></tr></table>',
    )
    expect(md).toContain('| 名称 | 数量 |')
    expect(md).toContain('| --- | --- |')
    expect(md).toContain('| 苹果 | 3 |')
  })

  it('表头 align 映射为对齐标记', () => {
    const { md } = htmlToMarkdown(
      '<table><thead><tr><th align="left">a</th><th align="center">b</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>',
    )
    expect(md).toMatch(/\| :-- \| :-: \|/)
  })
})
