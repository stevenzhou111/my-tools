import { describe, expect, it } from 'vitest'
import { mdToParagraphs, parseInline } from '@/utils/mdDocx'
import { detectEncoding, decodeWith, repairLatin1 } from '@/utils/encodingDetect'
import { beautifyCss, minifyCss } from '@/utils/cssFormat'

describe('mdDocx · Markdown 转段落', () => {
  it('标题层级映射字号并加粗', () => {
    const ps = mdToParagraphs('# 大标题\n### 小标题')
    expect(ps[0].sizeHalfPt).toBe(44)
    expect(ps[0].runs[0].bold).toBe(true)
    expect(ps[1].sizeHalfPt).toBe(30)
  })

  it('行内混排:粗体 / 斜体 / 行内代码 / 链接', () => {
    expect(parseInline('普通**加粗**结尾')).toEqual([{ text: '普通' }, { text: '加粗', bold: true }, { text: '结尾' }])
    const runs = parseInline('a *斜体* b `code` c [文档](https://a.b)')
    expect(runs[1]).toEqual({ text: '斜体', italic: true })
    expect(runs[3]).toEqual({ text: 'code', code: true })
    expect(runs[5].text).toBe('文档 (https://a.b)')
  })

  it('列表、引用、代码块与分隔线', () => {
    const ps = mdToParagraphs(['- 第一项', '1. 第二项', '', '> 引用', '', '```js', 'const a = 1', '```', '---'].join('\n'))
    expect(ps[0].runs[0].text).toBe('• ')
    expect(ps[0].indent).toBe(true)
    expect(ps[1].runs[0].text).toBe('1. ')
    expect(ps[2].runs[0].italic).toBe(true)
    expect(ps[3].runs[0].text).toBe('[代码:js]')
    expect(ps[4].runs[0].code).toBe(true)
    expect(ps[4].runs[0].text).toBe('const a = 1')
    // 代码块闭合后不再处于 fence 状态,分隔线正常输出
    expect(ps.at(-1).runs[0].text).toContain('──')
  })
})

describe('encodingDetect · 编码检测', () => {
  it('UTF-8 中文与 GBK 字节流各归其位', () => {
    const utf8 = new TextEncoder().encode('你好,世界')
    const r1 = detectEncoding(utf8)
    expect(r1.best).toBe('utf-8')
    expect(decodeWith(utf8, 'utf-8')).toBe('你好,世界')
    // 「中文」的 GBK 字节(D6D0 CEC4),UTF-8 fatal 解码必失败
    const gbkBytes = new Uint8Array([0xd6, 0xd0, 0xce, 0xc4])
    const r2 = detectEncoding(gbkBytes)
    expect(r2.best).toBe('gbk')
    expect(decodeWith(gbkBytes, 'gbk')).toBe('中文')
    expect(r2.results.find((x) => x.enc === 'utf-8').ok).toBe(false)
  })

  it('Shift-JIS 字节流命中日语编码', () => {
    // 「あ」= 82A0
    const r = detectEncoding(new Uint8Array([0x82, 0xa0]))
    expect(decodeWith(new Uint8Array([0x82, 0xa0]), 'shift-jis')).toBe('あ')
    expect(r.results.find((x) => x.enc === 'shift-jis').ok).toBe(true)
  })

  it('Latin-1 乱码反转修复', () => {
    const mangled = new TextDecoder('windows-1252').decode(new TextEncoder().encode('你好'))
    expect(mangled).not.toBe('你好')
    expect(repairLatin1(mangled)).toBe('你好')
    expect(repairLatin1('正常中文')).toBe(null)
  })
})

describe('cssFormat · CSS 美化与压缩', () => {
  it('压缩:去空白/分号/注释,声明内冒号后不留空格', () => {
    expect(minifyCss('body {\n  color : red ;\n  /* 注释 */\n  margin : 0 ;\n}')).toBe('body{color:red;margin:0}')
    expect(minifyCss('a , b { color : red }')).toBe('a,b{color:red}')
  })

  it('data URI 与字符串里的特殊字符不被误伤', () => {
    const css = `.x { background: url(data:image/png;base64,iVBOR+ abc) ; content: "a;b{c}" }`
    const min = minifyCss(css)
    expect(min).toContain('base64,iVBOR+ abc') // url() 内部原样保留
    expect(min).toContain('"a;b{c}"')
  })

  it('美化:嵌套 at-rule 缩进,一条声明一行', () => {
    const pretty = beautifyCss('@media screen{.a{color:red;margin:0}}')
    const lines = pretty.split('\n')
    expect(lines[0]).toBe('@media screen {')
    expect(lines[1]).toBe('  .a {')
    expect(lines[2]).toBe('    color: red')
    expect(lines[3]).toBe('    margin: 0')
    expect(lines.at(-1)).toBe('}')
  })

  it('注释在美化时保留、压缩时移除,往返稳定', () => {
    const css = '/* header */\n.a { color: red }'
    expect(beautifyCss(css).split('\n')[0]).toBe('/* header */')
    expect(minifyCss(css)).toBe('.a{color:red}')
    expect(minifyCss(beautifyCss(css))).toBe(minifyCss(css))
  })
})
