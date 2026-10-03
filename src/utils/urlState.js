import { onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { debounce } from './format'

/**
 * 把工具的本地状态同步到 URL query:刷新不丢、复制地址栏即可分享当前参数。
 *
 * - 挂载时从 route.query 读取,parse 通过才覆盖默认值;
 * - 状态变化时防抖 400ms 后 router.replace(替换当前历史,不产生回退记录);
 * - 序列化为空串时把该参数从地址栏移除,保持 URL 干净;
 * - 组件卸载时取消未落盘的写入,避免已卸载的组件改动路由。
 *
 * 用法:
 *   useUrlState([{ key: 'q', ref: input, parse: (s) => s }])
 *   // 可选 serialize(ref 值 → 字符串),默认 String(value)
 */
export function useUrlState(definitions) {
  const route = useRoute()
  const router = useRouter()

  for (const def of definitions) {
    const raw = route.query[def.key]
    if (typeof raw === 'string' && raw !== '') {
      const v = def.parse(raw)
      if (v !== undefined) def.ref.value = v
    }
  }

  const write = debounce(() => {
    const next = { ...route.query }
    let changed = false
    for (const def of definitions) {
      const s = def.serialize ? def.serialize(def.ref.value) : String(def.ref.value ?? '')
      if (!s) {
        if (next[def.key] !== undefined) {
          delete next[def.key]
          changed = true
        }
      } else if (next[def.key] !== s) {
        next[def.key] = s
        changed = true
      }
    }
    if (changed) router.replace({ query: next }).catch(() => {})
  }, 400)

  const stops = definitions.map((def) => watch(def.ref, () => write(), { deep: true }))
  onUnmounted(() => {
    write.cancel()
    stops.forEach((stop) => stop())
  })
}

/** 常用 parse:限定最大长度,防止把超长内容塞进地址栏 */
export function shortString(max = 200) {
  return (s) => (s.length <= max ? s : undefined)
}