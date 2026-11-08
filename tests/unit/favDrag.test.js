import { beforeEach, describe, expect, it } from 'vitest'
import { useFavDrag } from '../../src/utils/favDrag'
import { useToolPrefs } from '../../src/utils/prefs'
import { getTool } from '../../src/tools/registry'

// 首页与侧边栏共用的收藏拖拽排序:prefs 是模块级单例 ref,测试经 API 播种后用假事件对象验证行为
function fakeDrag() {
  return {
    dataTransfer: { effectAllowed: '', dropEffect: '', setData() {} },
    preventDefault() { this.defaultPrevented = true },
  }
}

beforeEach(() => {
  // 直接赋值单例 ref,与用户操作等效(watch 会持久化)
  useToolPrefs().favorites.value = ['json', 'qrcode', 'timestamp']
})

describe('favDrag · useFavDrag', () => {
  it('favTools 把收藏 id 映射为工具对象,失效 id 被过滤', () => {
    useToolPrefs().favorites.value = ['json', 'not-exist', 'qrcode']
    const { favTools } = useFavDrag()
    expect(favTools.value.map((t) => t.id)).toEqual(['json', 'qrcode'])
    expect(favTools.value[0]).toBe(getTool('json'))
  })

  it('dragstart 记录拖拽 id 并写入 dataTransfer(Firefox 兼容)', () => {
    const { dragFavId, onFavDragStart } = useFavDrag()
    const e = fakeDrag()
    onFavDragStart(e, getTool('qrcode'))
    expect(dragFavId.value).toBe('qrcode')
    expect(e.dataTransfer.effectAllowed).toBe('move')
  })

  it('悬停其他卡片即实时重排', () => {
    const { dragFavId, onFavDragStart, onFavDragOver } = useFavDrag()
    onFavDragStart(fakeDrag(), getTool('timestamp'))
    onFavDragOver(fakeDrag(), getTool('json'))
    expect(dragFavId.value).toBe('timestamp')
    expect(useToolPrefs().favorites.value).toEqual(['timestamp', 'json', 'qrcode'])
  })

  it('悬停自身不重排;未拖拽时 preventDefault 不触发(不劫持普通悬停)', () => {
    const { onFavDragStart, onFavDragOver } = useFavDrag()
    onFavDragStart(fakeDrag(), getTool('json'))
    const eSame = fakeDrag()
    onFavDragOver(eSame, getTool('json'))
    expect(eSame.defaultPrevented).toBeUndefined()
    expect(useToolPrefs().favorites.value).toEqual(['json', 'qrcode', 'timestamp'])

    const eIdle = fakeDrag()
    onFavDragOver(eIdle, getTool('json')) // 没有拖拽在进行
    expect(eIdle.defaultPrevented).toBeUndefined()
  })

  it('drop/dragend 清除拖拽状态', () => {
    const { dragFavId, onFavDragStart, onFavDrop, onFavDragEnd } = useFavDrag()
    onFavDragStart(fakeDrag(), getTool('json'))
    onFavDrop(fakeDrag())
    expect(dragFavId.value).toBeNull()
    onFavDragStart(fakeDrag(), getTool('json'))
    onFavDragEnd()
    expect(dragFavId.value).toBeNull()
  })
})
