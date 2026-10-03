import { ref } from 'vue'

/**
 * 全局轻提示(单例)。目前只服务于复制失败这一类「必须让用户知道」的静默失败,
 * 故意做成单条队列:后到的消息直接覆盖前一条,不做堆叠。
 */
const message = ref('')
const visible = ref(false)

let timer = null

export function useToast() {
  function showToast(msg, timeout = 2200) {
    message.value = msg
    visible.value = true
    clearTimeout(timer)
    timer = setTimeout(() => {
      visible.value = false
    }, timeout)
  }

  return { message, visible, showToast }
}