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
    el._draftKey = key
    restore(el, key)
    el._draftInput = () => {
      el._draftDirty = true
      clearTimeout(el._draftTimer)
      el._draftTimer = setTimeout(() => {
        el._draftDirty = false
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
    // 防抖窗口内(300ms)切走页面时同步落盘:直接 clear 会丢弃最后一次编辑
    if (el._draftDirty && el._draftKey) {
      try {
        sessionStorage.setItem(PREFIX + el._draftKey, el.value)
      } catch {
        /* ignore */
      }
    }
    clearTimeout(el._draftTimer)
    el.removeEventListener('input', el._draftInput)
    delete el._draftInput
    delete el._draftTimer
    delete el._draftDirty
    delete el._draftKey
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
