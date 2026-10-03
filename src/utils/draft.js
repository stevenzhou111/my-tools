/**
 * v-draft 指令:文本输入草稿自动保存。
 * 用法:v-draft="'唯一key'"(建议以工具 id 开头,多个输入框用不同后缀)。
 * 输入内容防抖写入 sessionStorage,重新进入工具页时自动恢复;
 * 会话结束后自动清空(刷新/关闭标签页),不会长期占用存储。
 */
const PREFIX = 'toolbox-draft:'

function restore(el, key) {
  let saved
  try {
    saved = sessionStorage.getItem(PREFIX + key)
  } catch {
    return
  }
  if (saved !== null && el.value !== saved) {
    el.value = saved
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }
}

export const vDraft = {
  mounted(el, binding) {
    const key = binding.value
    if (!key) return
    restore(el, key)
    el._draftInput = () => {
      clearTimeout(el._draftTimer)
      el._draftTimer = setTimeout(() => {
        try {
          sessionStorage.setItem(PREFIX + key, el.value)
        } catch {
          /* 存储不可用时静默跳过 */
        }
      }, 300)
    }
    el.addEventListener('input', el._draftInput)
  },
  unmounted(el) {
    clearTimeout(el._draftTimer)
    el.removeEventListener('input', el._draftInput)
    delete el._draftInput
    delete el._draftTimer
  },
}

export function clearAllDrafts() {
  try {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => sessionStorage.removeItem(k))
  } catch {
    /* ignore */
  }
}
