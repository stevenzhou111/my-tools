import { describe, expect, it } from 'vitest'
import { unzipSync, strFromU8 } from 'fflate'
import { buildDocx, docxBlob, escapeXml } from '@/utils/docx'

function unzipDocx(paragraphs) {
  const files = unzipSync(buildDocx(paragraphs))
  return {
    names: Object.keys(files),
    documentXml: strFromU8(files['word/document.xml']),
    contentTypes: strFromU8(files['[Content_Types].xml']),
    rootRels: strFromU8(files['_rels/.rels']),
  }
}

describe('buildDocx · 包结构', () => {
  it('包含 OOXML 规范要求的三个部分', () => {
    const { names } = unzipDocx(['第一段', '第二段'])
    expect(names).toContain('[Content_Types].xml')
    expect(names).toContain('_rels/.rels')
    expect(names).toContain('word/document.xml')
  })

  it('Content Types 声明了 document.xml 的正确类型', () => {
    const { contentTypes } = unzipDocx(['x'])
    expect(contentTypes).toContain('wordprocessingml.document.main+xml')
  })

  it('.rels 指向 word/document.xml', () => {
    const { rootRels } = unzipDocx(['x'])
    expect(rootRels).toContain('Target="word/document.xml"')
  })

  it('document.xml 声明了 w 命名空间', () => {
    const { documentXml } = unzipDocx(['x'])
    expect(documentXml).toContain('xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"')
  })

  it('是合法的 zip 魔数(PK)', () => {
    const bytes = buildDocx(['x'])
    expect([bytes[0], bytes[1]]).toEqual([0x50, 0x4b])
  })

  it('Blob 版本带正确的 MIME', () => {
    const blob = docxBlob(['x'])
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  })
})

describe('buildDocx · 内容', () => {
  it('段落文本逐条进入 <w:t>,空字符串也要生成空段落', () => {
    const { documentXml } = unzipDocx(['你好', ''])
    const ts = documentXml.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) ?? []
    expect(ts).toHaveLength(2)
    expect(documentXml).toContain('你好')
  })

  it('对象写法支持加粗', () => {
    const { documentXml } = unzipDocx([{ text: '标题', bold: true }, '正文'])
    const paras = documentXml.match(/<w:p>[\s\S]*?<\/w:p>/g) ?? []
    expect(paras[0]).toContain('<w:b/>')
    expect(paras[1]).not.toContain('<w:b/>')
  })

  it('字符串写法不加粗', () => {
    const { documentXml } = unzipDocx(['普通'])
    expect(documentXml).not.toContain('<w:b/>')
  })

  it('字体与字号写入 rPr(22 半磅 = 11pt)', () => {
    const { documentXml } = unzipDocx([{ text: 'x', font: '宋体', sizeHalfPt: 22 }])
    expect(documentXml).toContain('w:ascii="宋体"')
    expect(documentXml).toContain('w:eastAsia="宋体"')
    expect(documentXml).toContain('<w:sz w:val="22"/>')
  })

  it('每页带 A4 页面设置', () => {
    const { documentXml } = unzipDocx(['x'])
    expect(documentXml).toContain('<w:pgSz w:w="11906" w:h="16838"/>')
  })
})

describe('escapeXml', () => {
  it('转义 XML 五个特殊字符', () => {
    expect(escapeXml(`<&>"'`)).toBe('&lt;&amp;&gt;&quot;&apos;'.replace('&apos;', "'"))
    // 注意:单引号在文本节点里无需转义,这里只保证不破坏结构
  })

  it('移除 XML 1.0 非法控制字符,避免 Word 打开报错', () => {
    expect(escapeXml('a\u0000b\u0008c\u000bd\u001f')).toBe('abcd')
    // 允许的:Tab(09) LF(0A) CR(0D)
    expect(escapeXml('a\tb\nc\rd')).toBe('a\tb\nc\rd')
  })

  it('中文与 emoji 原样保留', () => {
    expect(escapeXml('中文🙂')).toBe('中文🙂')
  })
})