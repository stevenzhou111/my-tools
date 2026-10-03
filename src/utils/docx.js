/**
 * 极简 OOXML(.docx)生成器,只覆盖「纯文本段落 + 加粗」场景。
 * 之前用 docx 库只为导出提取的文本,却拖来 365KB 依赖(含一份 jszip);
 * 这里用项目已有的 fflate 手写三段必需 XML,产物 Word/WPS 均可打开。
 */
import { zipSync, strToU8 } from 'fflate'

const XML_DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'

export function escapeXml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // 控制字符会让 Word 直接报「内容有问题」,XML 1.0 不允许它们出现
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
}

const CONTENT_TYPES = `${XML_DECL}
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`

const ROOT_RELS = `${XML_DECL}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`

function paragraphXml({ text, bold, font = '微软雅黑', sizeHalfPt = 22, afterTwips = 120 }) {
  const rPr = `<w:rPr><w:rFonts w:ascii="${font}" w:eastAsia="${font}" w:hAnsi="${font}"/>${bold ? '<w:b/>' : ''}<w:sz w:val="${sizeHalfPt}"/><w:szCs w:val="${sizeHalfPt}"/></w:rPr>`
  return `<w:p><w:pPr>${bold ? '' : `<w:spacing w:after="${afterTwips}"/>`}${bold ? '<w:spacing w:after="120"/>' : ''}</w:pPr><w:r>${rPr}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`
}

/**
 * 生成 .docx 的 Uint8Array。
 * @param {Array<string|{text:string,bold?:boolean,font?:string,sizeHalfPt?:number,afterTwips?:number}>} paragraphs
 */
export function buildDocx(paragraphs) {
  const body = paragraphs
    .map((p) => (typeof p === 'string' ? { text: p } : p))
    .map(paragraphXml)
    .join('')
  const documentXml = `${XML_DECL}
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="851" w:footer="992"/></w:sectPr></w:body></w:document>`

  return zipSync(
    {
      '[Content_Types].xml': strToU8(CONTENT_TYPES),
      '_rels/.rels': strToU8(ROOT_RELS),
      'word/document.xml': strToU8(documentXml),
    },
    { level: 6 },
  )
}

export function docxBlob(paragraphs) {
  return new Blob([buildDocx(paragraphs)], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
}