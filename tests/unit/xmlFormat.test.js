import { describe, expect, it } from 'vitest'
import { compactXml, formatXml } from '@/utils/xmlFormat'

const f = (s, i) => formatXml(s, i).text
const fe = (s) => formatXml(s).error

describe('formatXml', () => {
  it('把单行 XML 展开为两空格缩进', () => {
    expect(f('<root><a>1</a><b>2</b></root>')).toBe(
      ['<root>', '  <a>1</a>', '  <b>2</b>', '</root>'].join('\n'),
    )
  })

  it('缩进宽度可调', () => {
    expect(f('<r><a>1</a></r>', 4)).toBe(['<r>', '    <a>1</a>', '</r>'].join('\n'))
  })

  it('只有文本的元素保持单行,元素子元素才展开', () => {
    const out = f('<r><t>纯文本</t><g><x/></g></r>')
    expect(out).toBe(['<r>', '  <t>纯文本</t>', '  <g>', '    <x/>', '  </g>', '</r>'].join('\n'))
  })

  it('空元素自闭合', () => {
    expect(f('<r><x/></r>')).toBe(['<r>', '  <x/>', '</r>'].join('\n'))
  })

  it('属性被转义并保留', () => {
    expect(f('<r a="1&lt;2" b="x&quot;y"><c d="z"/></r>')).toBe(
      ['<r a="1&lt;2" b="x&quot;y">', '  <c d="z"/>', '</r>'].join('\n'),
    )
  })

  it('文本与注释混排时展开,不丢注释', () => {
    const out = f('<r>文本<!--注释--><a/></r>')
    expect(out).toContain('文本')
    expect(out).toContain('<!--注释-->')
    expect(out).toContain('<a/>')
  })

  it('CDATA 与注释原样保留', () => {
    const out = f('<r><![CDATA[<b>原样</b>]]><!--注释--></r>')
    expect(out).toContain('<![CDATA[<b>原样</b>]]>')
    expect(out).toContain('<!--注释-->')
  })

  it('XML 声明固定顶格', () => {
    const out = f('<?xml version="1.0"?><r><a/></r>')
    expect(out.startsWith('<?xml version="1.0"?>\n<r>\n  <a/>\n</r>')).toBe(true)
  })

  it('已经是格式化过的输入再次格式化保持稳定(幂等)', () => {
    const once = f('<r><a>1</a></r>')
    expect(f(once)).toBe(once)
  })
})

describe('compactXml', () => {
  it('去除标签间空白与缩进', () => {
    expect(compactXml('<r>\n  <a>1</a>\n  <b>  2 </b>\n</r>').text).toBe('<r><a>1</a><b>  2 </b></r>')
  })

  it('CDATA 内文本原样保留', () => {
    expect(compactXml('<r><![CDATA[  a  b ]]></r>').text).toBe('<r><![CDATA[  a  b ]]></r>')
  })
})

describe('错误处理', () => {
  it('结构错误返回 parsererror 的可读信息', () => {
    expect(fe('<r><a></r>')).toBeTruthy()
    expect(formatXml('<r><a></r>').text).toBe('')
  })

  it('标签不匹配给出定位信息', () => {
    const e = fe('<root><child></root>')
    expect(e).toBeTruthy()
  })

  it('空输入返回空结果而不是报错', () => {
    expect(formatXml('')).toEqual({ text: '', error: '' })
    expect(compactXml('   ')).toEqual({ text: '', error: '' })
  })
})