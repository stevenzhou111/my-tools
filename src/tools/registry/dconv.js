// 文档转换分类的工具(7 个)。条目按上线时间追加在本文件内;
// 新增工具请把条目加到对应分类的数组末尾。
import { lazy } from './lazy'

export const TOOLS = [
  {
    id: 'pdf-to-image', name: 'PDF 转图片', category: 'dconv', icon: 'images',
    desc: '每一页渲染为高清 PNG / JPG,打包 ZIP 下载',
    keywords: 'pdf 转图片 转png 转jpg 渲染 截图 页面',
    about: '基于 pdf.js 逐页渲染:1x 标清适合屏幕浏览,2x/3x 高清适合印刷;支持 PNG 与 JPG 两种格式,多页自动打包 ZIP。',
    component: lazy(() => import('../pdf-to-image/PdfToImage.vue')),
  },
  {
    id: 'pdf-extract', name: 'PDF 提取文本', category: 'dconv', icon: 'scan-text',
    desc: '提取 PDF 全部文字,导出为 纯文本 / Word / HTML',
    keywords: 'pdf 提取文本 转word 转html 转txt 文字',
    about: '按页提取全部文字,可复制或导出为 .txt / .docx / .html,HTML 版还支持直接打印存为 PDF。⚠️ 仅提取文字层,不含图片与原始排版(浏览器无法做到高保真版式还原)。',
    component: lazy(() => import('../pdf-extract/PdfExtract.vue')),
  },
  {
    id: 'pdf-compress', name: 'PDF 压缩', category: 'dconv', icon: 'archive',
    desc: '重采样页面压缩 PDF 体积,可调清晰度与质量',
    keywords: 'pdf 压缩 缩小 体积 减小 光栅化',
    about: '原理:把每页渲染成 JPEG 后重新组装为 PDF,倍率与质量越低体积越小;⚠️ 压缩后文字变为图片,不可选中/搜索。若压缩结果比原文件还大(纯文字 PDF),会明确提示。',
    component: lazy(() => import('../pdf-compress/PdfCompress.vue')),
  },
  {
    id: 'word-to-html', name: 'Word 转 HTML', category: 'dconv', icon: 'file-type',
    desc: '解析 .docx 为 HTML 预览,可复制 / 下载 / 打印存 PDF',
    keywords: 'word docx 转 html 转pdf 预览 mammoth',
    about: '基于 mammoth 解析 .docx,保留标题、段落、列表、表格与图片;支持复制 HTML、下载网页文件,以及「打印 / 存为 PDF」(走浏览器打印)。⚠️ 仅支持 .docx,旧版二进制 .doc 无法在浏览器解析。',
    component: lazy(() => import('../word-to-html/WordToHtml.vue')),
  },
  {
    id: 'md-to-docx', name: 'Markdown 转 Word', category: 'dconv', icon: 'file-output',
    desc: 'Markdown 转为 .docx:标题/列表/粗斜体/代码块,本地打包',
    keywords: 'markdown word docx 转换 周报 文档 导出',
    about: '把 Markdown 子集(1-6 级标题、粗体/斜体/行内代码、无序与有序列表、引用、代码块、分隔线)转换为 Word 文档,链接渲染为文本+URL。基于内置的极简 OOXML 生成器在浏览器本地打包,无需上传;右侧提供近似排版预览。表格等复杂结构请用专门的表格工具。',
    component: lazy(() => import('../md-to-docx/MdToDocx.vue')),
  },
  {
    id: 'excel-export', name: 'Excel 转图片/PDF', category: 'dconv', icon: 'image-down',
    desc: '把表格渲染成 PNG 长图或 A4 分页 PDF',
    keywords: 'excel 转图片 转pdf 表格 截图 长图 分页',
    about: '本地把表格数据绘制成带表头与斑马纹的表格图:PNG(多工作表打包 ZIP)或 A4 纵向 PDF(长表自动分页)。',
    component: lazy(() => import('../excel-export/ExcelExport.vue')),
  },
  {
    id: 'format-convert', name: '办公格式互转', category: 'dconv', icon: 'arrow-left-right',
    desc: 'XLSX ↔ XLS ↔ ODS ↔ CSV ↔ HTML 互转',
    keywords: 'xlsx xls ods csv 转换 格式互转 openoffice wps',
    about: '基于 SheetJS 的全格式互转:现代 Excel、Excel 97-2003、OpenDocument(ODS)、CSV 与 HTML 网页表格之间任意转换,多工作表完整保留(CSV 仅导出首个)。',
    component: lazy(() => import('../format-convert/FormatConvert.vue')),
  },
]
