/**
 * 拼音搜索:工具名的全拼与首字母索引,供首页搜索与命令面板共用。
 *
 * pinyin-pro 的完整词典不小,因此在「用户真的开始搜索」时才动态加载:
 * 索引构建后存入 ref,命中结果随响应式更新自动刷新;
 * 库加载失败(弱网)时静默退回纯关键词搜索,不影响其他匹配。
 */
import { ref } from 'vue'
import { TOOLS } from '@/tools/registry'

// Map<工具id, { full: '全拼', abbr: '首字母' }>,null 表示尚未就绪
const INDEX = ref(null)
let loading = false

export function pinyinReady() {
  return INDEX.value !== null
}

/** 触发索引构建(幂等,可放心在每次开始搜索时调用) */
export async function ensurePinyinIndex() {
  if (INDEX.value || loading) return
  loading = true
  try {
    const { pinyin } = await import('pinyin-pro')
    const map = new Map()
    for (const t of TOOLS) {
      // nonZh consecutive:名称里的英文/数字原样保留(JSON 格式化 → jsongeshihua)
      const full = pinyin(t.name, { toneType: 'none', type: 'array', nonZh: 'consecutive' }).join('').toLowerCase()
      const abbr = pinyin(t.name, { pattern: 'first', toneType: 'none', type: 'array', nonZh: 'consecutive' }).join('').toLowerCase()
      map.set(t.id, { full, abbr })
    }
    INDEX.value = map
  } catch {
    /* 词典加载失败:退回关键词匹配 */
  } finally {
    loading = false
  }
}

/**
 * 拼音命中判断。q 应已小写;全拼支持子串(ewma→erweima 命中),
 * 首字母要求前缀(ewm→ewmsc 命中,避免 wmsc 之类散串误报)。
 */
export function pinyinHit(tool, q) {
  const p = INDEX.value?.get(tool.id)
  if (!p || q.length < 2) return false
  const hasCJK = /[\u4e00-\u9fa5]/.test(q)
  if (hasCJK) return p.full.includes(q) || tool.name.toLowerCase().includes(q)
  return p.full.includes(q) || p.abbr.startsWith(q)
}
