import { ref, watch } from 'vue'
import { TOOLS } from '@/tools/registry'

const FAV_KEY = 'toolbox-favorites'
const RECENT_KEY = 'toolbox-recents'
const USAGE_KEY = 'toolbox-usage'
export const MAX_RECENTS = 8

function load(key) {
  try {
    const v = JSON.parse(localStorage.getItem(key))
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

function loadObj(key) {
  try {
    const v = JSON.parse(localStorage.getItem(key))
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {}
  } catch {
    return {}
  }
}

// 模块级单例:收藏、最近使用与使用统计全站共享
const favorites = ref(load(FAV_KEY))
const recents = ref(load(RECENT_KEY))
const usage = ref(loadObj(USAGE_KEY)) // { [toolId]: 打开次数 }

// 清洗已下线工具的残留 id:展示层靠 filter(Boolean) 静默吞掉,storage 里却永久滞留
const VALID_IDS = new Set(TOOLS.map((t) => t.id))
favorites.value = favorites.value.filter((id) => VALID_IDS.has(id))
recents.value = recents.value.filter((id) => VALID_IDS.has(id))

watch(favorites, (v) => {
  try { localStorage.setItem(FAV_KEY, JSON.stringify(v)) } catch { /* 隐私模式忽略 */ }
}, { deep: true })

watch(recents, (v) => {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(v)) } catch { /* 隐私模式忽略 */ }
}, { deep: true })

watch(usage, (v) => {
  try { localStorage.setItem(USAGE_KEY, JSON.stringify(v)) } catch { /* 隐私模式忽略 */ }
}, { deep: true })

// ---------- 工具本机数据(纳入换机迁移体系) ----------
// 此前部分工具各自直接读写 localStorage,「导出收藏」带不走它们。统一经 useAppData
// 创建持久化 ref 后,exportPrefs/importPrefs 会一并打包迁移。
// 注意:RSS 阅读的 toolbox-rss-last 是带 fetchedAt 的瞬态缓存,刻意不纳入。
export const APP_STATE_KEYS = [
  'toolbox-countdown-days', // 倒数日/纪念日条目
  'toolbox-metronome', // 节拍器设置 { bpm, beatsPerBar }
  'toolbox-sci-calc-history', // 科学计算历史(30 条)
  'toolbox-typing-best', // 打字速度最佳成绩 { cn, en }
]

const appStateRefs = new Map()

/**
 * 工具本机数据的持久化 ref:登记过的键才可用(防止散乱键名失控),
 * 首次调用从 localStorage 恢复,之后任何变更自动写回。
 */
export function useAppData(key, fallback) {
  if (!APP_STATE_KEYS.includes(key)) throw new Error(`useAppData: 未登记的存储键 ${key},请加入 APP_STATE_KEYS`)
  if (appStateRefs.has(key)) return appStateRefs.get(key)
  let initial = fallback
  try {
    const raw = localStorage.getItem(key)
    if (raw !== null) initial = JSON.parse(raw)
  } catch { /* 损坏数据回退默认值 */ }
  const r = ref(initial === undefined ? fallback : initial)
  watch(r, (v) => {
    try { localStorage.setItem(key, JSON.stringify(v)) } catch { /* 隐私模式忽略 */ }
  }, { deep: true })
  appStateRefs.set(key, r)
  return r
}

/** 合并规则:两边都是数组 → 按条目 JSON 去重、导入的排前面(与收藏的合并语义一致);否则导入值整体覆盖 */
function mergeState(current, imported) {
  if (Array.isArray(imported) && Array.isArray(current)) {
    const seen = new Set()
    const merged = []
    for (const item of [...imported, ...current]) {
      const sig = JSON.stringify(item)
      if (!seen.has(sig)) { seen.add(sig); merged.push(item) }
    }
    return merged.slice(0, 500)
  }
  return imported
}

export function useToolPrefs() {
  function isFav(id) {
    return favorites.value.includes(id)
  }

  function toggleFav(id) {
    const i = favorites.value.indexOf(id)
    if (i >= 0) favorites.value.splice(i, 1)
    else favorites.value.unshift(id)
  }

  function pushRecent(id) {
    const i = recents.value.indexOf(id)
    if (i >= 0) recents.value.splice(i, 1)
    recents.value.unshift(id)
    if (recents.value.length > MAX_RECENTS) recents.value.length = MAX_RECENTS
  }

  /** 收藏排序:把 id 移动到目标下标(拖拽排序用),越界静默忽略 */
  function reorderFav(id, toIndex) {
    const from = favorites.value.indexOf(id)
    if (from < 0 || toIndex < 0 || toIndex >= favorites.value.length || from === toIndex) return
    favorites.value.splice(from, 1)
    favorites.value.splice(toIndex, 0, id)
  }

  /** 使用统计 +1(进入工具页时调用) */
  function bumpUsage(id) {
    usage.value = { ...usage.value, [id]: (usage.value[id] || 0) + 1 }
  }

  /** 最常用工具 TOP n(按次数降序,平局按 id 码点稳定排序) */
  function topUsed(n = 8) {
    return Object.entries(usage.value)
      .filter(([id]) => VALID_IDS.has(id))
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => b.count - a.count || (a.id < b.id ? -1 : 1))
      .slice(0, n)
  }

  /** 清空使用统计(收藏/最近使用不受影响) */
  function clearUsage() {
    usage.value = {}
  }

  /** 导出:收藏、最近使用、使用统计与已初始化的工具本机数据打包成 JSON 文本(换机迁移用) */
  function exportPrefs() {
    const states = {}
    for (const k of APP_STATE_KEYS) {
      if (appStateRefs.has(k)) states[k] = appStateRefs.get(k).value
    }
    return JSON.stringify({ app: 'vue-toolbox', version: 3, favorites: favorites.value, recents: recents.value, usage: usage.value, states }, null, 2)
  }

  /**
   * 导入:解析 JSON 并与现有数据合并(导入的排前面,去重),返回加入的收藏数。
   * states 仅接受 APP_STATE_KEYS 里登记的键:数组类合并去重、设置类整体覆盖;
   * 工具尚未在本会话初始化时直接落盘,首次打开该工具即可读到。
   * 非法内容抛出可读错误;已下线工具的 id 静默丢弃。
   */
  function importPrefs(text) {
    let data
    try {
      data = JSON.parse(String(text || ''))
    } catch {
      throw new Error('文件不是合法的 JSON')
    }
    if (!data || !Array.isArray(data.favorites)) throw new Error('缺少 favorites 字段,请确认是本站导出的文件')
    const favs = data.favorites.filter((x) => typeof x === 'string' && VALID_IDS.has(x))
    const recs = Array.isArray(data.recents) ? data.recents.filter((x) => typeof x === 'string' && VALID_IDS.has(x)) : []
    const before = favorites.value.length
    favorites.value = [...new Set([...favs, ...favorites.value])]
    recents.value = [...new Set([...recs, ...recents.value])].slice(0, MAX_RECENTS)

    let importedStates = 0
    // 使用统计:逐工具取两边较大值(避免重复导入把次数翻倍)
    if (data.usage && typeof data.usage === 'object' && !Array.isArray(data.usage)) {
      const merged = { ...usage.value }
      for (const [id, count] of Object.entries(data.usage)) {
        if (!VALID_IDS.has(id) || !Number.isFinite(count) || count <= 0) continue
        merged[id] = Math.max(merged[id] || 0, Math.round(count))
      }
      usage.value = merged
    }
    if (data.states && typeof data.states === 'object' && !Array.isArray(data.states)) {
      for (const [k, v] of Object.entries(data.states)) {
        if (v === undefined || !APP_STATE_KEYS.includes(k)) continue
        // 形状防御:只接受数组/对象/null,标量(损坏或伪造的文件)静默跳过
        if (v !== null && !Array.isArray(v) && typeof v !== 'object') continue
        const r = appStateRefs.get(k)
        if (r) {
          r.value = mergeState(r.value, v)
        } else {
          try {
            let current
            try { current = JSON.parse(localStorage.getItem(k)) } catch { /* 损坏数据按无处理 */ }
            localStorage.setItem(k, JSON.stringify(mergeState(current, v)))
          } catch { /* 隐私模式忽略 */ }
        }
        importedStates++
      }
    }
    return { added: favorites.value.length - before, importedFavs: favs.length, importedRecents: recs.length, importedStates }
  }

  /** 清空最近使用记录(收藏不受影响) */
  function clearRecents() {
    recents.value = []
  }

  return { favorites, recents, usage, isFav, toggleFav, pushRecent, reorderFav, bumpUsage, topUsed, clearUsage, exportPrefs, importPrefs, clearRecents }
}
