import { computed, ref } from 'vue'
import { useToolPrefs } from './prefs'
import { getTool } from '@/tools/registry'

/**
 * 收藏卡片拖拽排序:首页与侧边栏共用同一实现(此前两边各复制一份)。
 * 悬停即实时重排,favorites 顺序驱动卡片跟着走,松手即落位。
 */
export function useFavDrag() {
  const { favorites, reorderFav } = useToolPrefs()
  const dragFavId = ref(null)

  const favTools = computed(() => favorites.value.map((id) => getTool(id)).filter(Boolean))

  function onFavDragStart(e, tool) {
    dragFavId.value = tool.id
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', tool.id) // Firefox 需有数据才启动拖拽
  }
  function onFavDragOver(e, tool) {
    if (!dragFavId.value || dragFavId.value === tool.id) return
    e.preventDefault() // 允许放置
    e.dataTransfer.dropEffect = 'move'
    reorderFav(dragFavId.value, favTools.value.findIndex((f) => f.id === tool.id))
  }
  function onFavDrop(e) {
    e.preventDefault()
    dragFavId.value = null
  }
  function onFavDragEnd() {
    dragFavId.value = null
  }
  return { favTools, dragFavId, onFavDragStart, onFavDragOver, onFavDrop, onFavDragEnd }
}
