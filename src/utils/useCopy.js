import { ref } from 'vue'
import { copyText } from './clipboard'
import { useToast } from './toast'

/**
 * 提供「点击复制 + 短暂显示已复制」的通用逻辑。
 * copy(key, text) 后,copiedKey 在 timeout 内等于 key。
 * 复制失败时(非 HTTPS、权限被拒、execCommand 降级也失败)弹全局提示,
 * 否则 47 个调用方的按钮会毫无反应,用户无从得知。
 */
export function useCopy(timeout = 1500) {
  const copiedKey = ref('')
  const { showToast } = useToast()

  async function copy(key, text) {
    const ok = await copyText(text)
    if (!ok) {
      showToast('复制失败,请手动选中内容按 Ctrl+C')
      return false
    }
    copiedKey.value = key
    setTimeout(() => {
      if (copiedKey.value === key) copiedKey.value = ''
    }, timeout)
    return true
  }

  return { copiedKey, copy }
}
