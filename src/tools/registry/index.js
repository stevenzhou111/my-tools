// 工具注册表唯一数据源:12 分类 + 全部工具,路由/首页/搜索/命令面板/sitemap 全部由它派生。
// 工具条目按分类放在同目录 <分类>.js 中(lazy 封装在 ./lazy),本文件负责聚合与查询。
import { TOOLS as convertTools } from './convert'
import { TOOLS as devTools } from './dev'
import { TOOLS as textTools } from './text'
import { TOOLS as imageTools } from './image'
import { TOOLS as generateTools } from './generate'
import { TOOLS as calcTools } from './calc'
import { TOOLS as docTools } from './doc'
import { TOOLS as dconvTools } from './dconv'
import { TOOLS as avTools } from './av'
import { TOOLS as chartTools } from './chart'
import { TOOLS as officeTools } from './office'
import { TOOLS as softwareTools } from './software'

export { lazy } from './lazy'

export const CATEGORIES = [
  { id: 'convert', name: '编码转换', icon: 'repeat' },
  { id: 'dev', name: '开发工具', icon: 'wrench' },
  { id: 'text', name: '文本工具', icon: 'file-text' },
  { id: 'image', name: '图片工具', icon: 'image' },
  { id: 'generate', name: '生成器', icon: 'sparkles' },
  { id: 'calc', name: '计算换算', icon: 'calculator' },
  { id: 'doc', name: '文档处理', icon: 'files' },
  { id: 'dconv', name: '文档转换', icon: 'arrow-left-right' },
  { id: 'av', name: '音视频', icon: 'clapperboard' },
  { id: 'chart', name: '数据图表', icon: 'chart-column' },
  { id: 'office', name: '办公辅助', icon: 'paperclip' },
  { id: 'software', name: '软件推荐', icon: 'hard-drive' },
]

export const TOOLS = [
  ...convertTools,
  ...devTools,
  ...textTools,
  ...imageTools,
  ...generateTools,
  ...calcTools,
  ...docTools,
  ...dconvTools,
  ...avTools,
  ...chartTools,
  ...officeTools,
  ...softwareTools,
]

const TOOL_MAP = new Map(TOOLS.map((t) => [t.id, t]))
const CATEGORY_MAP = new Map(CATEGORIES.map((c) => [c.id, c]))

export function getTool(id) {
  return TOOL_MAP.get(id)
}

export function getCategory(id) {
  return CATEGORY_MAP.get(id)
}
