import { defineAsyncComponent } from 'vue'
import ToolLoadError from '@/components/ToolLoadError.vue'

// 异步加载失败时展示可重试的错误组件,避免弱网下白屏。
// prefetch 暴露原始 loader:卡片悬停时预热 chunk,点击时几乎零等待(失败静默)。
export function lazy(loader) {
  const comp = defineAsyncComponent({
    loader,
    errorComponent: ToolLoadError,
    delay: 120,
  })
  comp.prefetch = () => Promise.resolve(loader()).catch(() => {})
  return comp
}
