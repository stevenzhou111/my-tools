// 文档处理分类的工具(9 个)。条目按上线时间追加在本文件内;
// 新增工具请把条目加到对应分类的数组末尾。
import { lazy } from './lazy'

export const TOOLS = [
  {
    id: 'pdf-merge', name: 'PDF 合并', category: 'doc', icon: 'files',
    desc: '将多个 PDF 按顺序合并为一个文件',
    keywords: 'pdf 合并 merge 拼接 文档',
    about: '按列表顺序合并,可上下移动调整;加密 PDF 会被明确拒绝而不是产出损坏文件。全部处理在浏览器完成,PDF 不上传。',
    component: lazy(() => import('../pdf-merge/PdfMerge.vue')),
  },
  {
    id: 'pdf-organize', name: 'PDF 页面整理', category: 'doc', icon: 'rows-3',
    desc: '按页码提取、删除、旋转页面,或逐页拆分为 ZIP',
    keywords: 'pdf 拆分 提取 删除 旋转 页码 split extract 重排',
    about: '页码范围写法如 1-3,5,8-9。「按此页序重排」允许任意顺序与重复页(如 3,1-2,3);逐页拆分会打包成 ZIP。',
    component: lazy(() => import('../pdf-organize/PdfOrganize.vue')),
  },
  {
    id: 'pdf-watermark', name: 'PDF 添加水印', category: 'doc', icon: 'stamp',
    desc: '为 PDF 每一页添加倾斜的半透明文字水印',
    keywords: 'pdf 水印 watermark 文字 版权',
    about: '每页居中绘制倾斜的半透明水印,可调字号、透明度与角度。注意:PDF 标准字体不支持中文,请使用英文/数字水印。',
    component: lazy(() => import('../pdf-watermark/PdfWatermark.vue')),
  },
  {
    id: 'pdf-page-number', name: 'PDF 添加页码', category: 'doc', icon: 'list-ordered',
    desc: '在 PDF 页面底部添加「第 x 页 / 共 y 页」页码',
    keywords: 'pdf 页码 页数 添加 页脚',
    about: '三个位置可选(左下/居中/右下),支持自定义起始页码与是否显示总页数,适合打印装订前补页码。',
    component: lazy(() => import('../pdf-page-number/PdfPageNumber.vue')),
  },
  {
    id: 'image-to-pdf', name: '图片转 PDF', category: 'doc', icon: 'printer',
    desc: '多张图片合并转换为一个 PDF 文件,每图一页',
    keywords: '图片 pdf 转换 jpg png 合并',
    about: '每张图片一页、页面尺寸与图片一致;WebP 等格式会先转成 JPEG 再嵌入(透明区域铺白底)。',
    component: lazy(() => import('../image-to-pdf/ImageToPdf.vue')),
  },
  {
    id: 'excel-convert', name: 'Excel 格式转换', category: 'doc', icon: 'sheet',
    desc: 'Excel / CSV 转 JSON、CSV、Markdown、HTML、TXT',
    keywords: 'excel csv json markdown html txt 表格 转换 xlsx',
    about: 'CSV 自动识别 UTF-8 与 GBK 编码(中文 Excel 导出不乱码);多工作表会全部转换并以标题分隔。',
    component: lazy(() => import('../excel-convert/ExcelConvert.vue')),
  },
  {
    id: 'json-excel', name: 'JSON ↔ Excel', category: 'doc', icon: 'table',
    desc: 'JSON 数组生成 Excel / CSV 文件,Excel 也可转回 JSON',
    keywords: 'json excel 互转 xlsx csv 表格 json转excel excel转json',
    about: '正向要求 JSON 对象数组(键即表头);CSV 导出带 BOM,Excel 双击打开不乱码。反向支持多 Sheet(输出按 Sheet 名分组)。',
    component: lazy(() => import('../json-excel/JsonExcel.vue')),
  },
  {
    id: 'excel-merge', name: 'Excel 合并/拆分', category: 'doc', icon: 'library',
    desc: '多个 Excel 合并为一个多 Sheet 文件,或反向拆分',
    keywords: 'excel 合并 拆分 sheet 工作表 xlsx 多文件',
    about: '合并时所有工作表汇入一个 xlsx(同名自动加序号);拆分把每个 Sheet 导出为独立 xlsx 并打包 ZIP。',
    component: lazy(() => import('../excel-merge/ExcelMerge.vue')),
  },
  {
    id: 'xlsx-sql', name: 'Excel → SQL', category: 'doc', icon: 'database-zap',
    desc: '把 Excel / CSV 行生成 INSERT INTO 语句,MySQL / PG 方言',
    keywords: 'excel csv sql insert 生成 数据库 灌数据 导入 mysql postgresql',
    about: '选一个 Excel / CSV,把每行数据生成 INSERT INTO 语句用于给测试库灌数据:MySQL(反引号)与 PostgreSQL(双引号)两种方言、多行合并或每行一条、空单元格输出 NULL、字符串自动转义单引号、日期按 YYYY-MM-DD HH:MM:SS;多工作表可切换,结果可复制或下载 .sql。全部在本地解析,不上传文件。',
    component: lazy(() => import('../xlsx-sql/XlsxSql.vue')),
  },
  {
    id: 'pdf-ocr', name: '扫描版 PDF 文字识别', category: 'doc', icon: 'file-scan', online: true, fresh: true,
    desc: '图片型 PDF 逐页本机 OCR,9 种语言',
    keywords: 'pdf ocr 文字识别 扫描件 提取文字 图片型 tesseract',
    about: '扫描件/图片型 PDF(没有文字层、复制不了字)专用:本机逐页渲染成位图后交给 Tesseract.js 识别(与「图片文字识别」同一套引擎与模型缓存,9 种语言可多选)。每页文本按「第 N 页」分节,可复制或下载 .txt;上限 50 页,更长的 PDF 建议先拆分。首次联网下载模型后离线可用,文件全程不上传。',
    component: lazy(() => import('../pdf-ocr/PdfOcr.vue')),
  },

]
