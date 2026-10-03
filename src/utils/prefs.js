import { ref, watch } from 'vue'

const FAV_KEY = 'toolbox-favorites'
const RECENT_KEY = 'toolbox-recents'
export const MAX_RECENTS = 8

function load(key) {
  try {
    const v = JSON.parse(localStorage.getItem(key))
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

// 模块级单例:收藏与最近使用全站共享
const favorites = ref(load(FAV_KEY))
const recents = ref(load(RECENT_KEY))

watch(favorites, (v) => {
  try { localStorage.setItem(FAV_KEY, JSON.stringify(v)) } catch { /* 隐私模式忽略 */ }
}, { deep: true })

watch(recents, (v) => {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(v)) } catch { /* 隐私模式忽略 */ }
}, { deep: true })

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

  return { favorites, recents, isFav, toggleFav, pushRecent }
}
