// 数据图表分类的工具(2 个)。条目按上线时间追加在本文件内;
// 新增工具请把条目加到对应分类的数组末尾。
import { lazy } from './lazy'

export const TOOLS = [
  {
    id: 'chart', name: '图表制作', category: 'chart', icon: 'chart-line',
    desc: '粘贴数据一键生成柱状、折线、饼图、雷达等 10 种图表',
    keywords: '图表 柱状图 折线图 饼图 雷达图 散点图 漏斗图 图表制作',
    about: '数据格式:每行一条,逗号分隔,第一列是标签、其余列是数值;首行若为非数字则视为系列名。基于 ECharts 按需打包,可导出 2x 高清 PNG。',
    component: lazy(() => import('../chart/ChartTool.vue')),
  },
  {
    id: 'word-cloud', name: '词云图生成', category: 'chart', icon: 'cloud',
    desc: '文本一键生成词云图,高频词更大,导出高清 PNG',
    keywords: '词云 word cloud 词频 标签云 可视化 文本分析 生成 图表',
    about: '粘贴文本(或载入 .txt/.md)生成词云:英文按单词(自动滤除 the/and 等虚词)、中文可切换逐字统计,高频词字号更大、按频次配色,螺旋布局避免重叠;最多 200 词,画布尺寸与四套配色可调,导出 2x 高清 PNG。布局纯本地计算,与「词频统计」配套:那边看数据,这边看图。',
    urlState: true,
    component: lazy(() => import('../word-cloud/WordCloud.vue')),
  },
]
