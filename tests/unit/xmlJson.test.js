import { describe, expect, it } from 'vitest'
import { jsonToXml, xmlToJson } from '@/utils/xmlJson'

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<book id="1" category="novel">
  <title>三体</title>
  <author>刘慈欣</author>
  <tags>
    <tag>科幻</tag>
    <tag>小说</tag>
  </tags>
  <price>45.00</price>
  <outOfPrint />
</book>`

describe('xmlJson · XML → JSON', () => {
  it('属性、子元素、同名数组、纯文本元素', () => {
    const { ok, data, error } = xmlToJson(SAMPLE)
    expect(ok, error).toBe(true)
    expect(data).toEqual({
      book: {
        '@id': '1',
        '@category': 'novel',
        title: '三体',
        author: '刘慈欣',
        tags: { tag: ['科幻', '小说'] },
        price: '45.00',
        outOfPrint: '',
      },
    })
  })

  it('单根包裹:根元素名作为顶层键', () => {
    const { ok, data } = xmlToJson('<a><b>1</b></a>')
    expect(ok).toBe(true)
    expect(Object.keys(data)).toEqual(['a'])
  })

  it('带属性元素的内文本进入 #text', () => {
    const { data } = xmlToJson('<item id="7">内容</item>')
    expect(data.item).toEqual({ '@id': '7', '#text': '内容' })
  })

  it('非法 XML 报错且信息可读', () => {
    const { ok, error } = xmlToJson('<a><b></a>')
    expect(ok).toBe(false)
    expect(error).toContain('XML 不合法')
  })

  it('空字符串与多根报错', () => {
    expect(xmlToJson('').ok).toBe(false)
    expect(xmlToJson('<a/><b/>').ok).toBe(false)
  })
})

describe('xmlJson · JSON → XML', () => {
  it('生成带声明的 XML,属性 / 文本 / 数组各就各位', () => {
    const { ok, data, error } = jsonToXml({
      book: { '@id': '1', title: '三体', tags: { tag: ['科幻', '小说'] } },
    })
    expect(ok, error).toBe(true)
    expect(data).toBe(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<book id="1">',
        '  <title>三体</title>',
        '  <tags>',
        '    <tag>科幻</tag>',
        '    <tag>小说</tag>',
        '  </tags>',
        '</book>',
      ].join('\n'),
    )
  })

  it('空对象输出自闭合元素,标量输出文本元素', () => {
    const { ok, data } = jsonToXml({ root: { a: {}, b: 'x' } })
    expect(ok).toBe(true)
    expect(data).toContain('<a />')
    expect(data).toContain('<b>x</b>')
  })

  it('特殊字符被转义', () => {
    const { ok, data } = jsonToXml({ root: { t: 'a<b>&"c' } })
    expect(ok).toBe(true)
    expect(data).toContain('<t>a&lt;b&gt;&amp;"c</t>')
  })

  it('顶层不是单键对象时报错', () => {
    expect(jsonToXml('text').ok).toBe(false)
    expect(jsonToXml([1]).ok).toBe(false)
    expect(jsonToXml({ a: 1, b: 2 }).ok).toBe(false)
    expect(jsonToXml({ root: [1, 2] }).ok).toBe(false)
  })

  it('可关闭声明', () => {
    const { data } = jsonToXml({ root: 1 }, { declaration: false })
    expect(data).not.toContain('<?xml')
  })
})

describe('xmlJson · 往返', () => {
  it('XML → JSON → XML → JSON 结果稳定', () => {
    const first = xmlToJson(SAMPLE)
    const xml2 = jsonToXml(first.data)
    expect(xml2.ok).toBe(true)
    const second = xmlToJson(xml2.data)
    expect(second.ok).toBe(true)
    expect(second.data).toEqual(first.data)
  })
})
