import { ref } from 'vue'

/**
 * 深浅主题:模块级单例,App 顶栏与命令面板动作共用同一份状态。
 */
const theme = ref(
  typeof document !== 'undefined' ? document.documentElement.dataset.theme || 'light' : 'light',
)

function apply(next) {
  theme.value = next
  if (typeof document !== 'undefined') document.documentElement.dataset.theme = next
  try {
    localStorage.setItem('toolbox-theme', next)
  } catch {
    /* 隐私模式下 localStorage 不可用,忽略即可 */
  }
}

export function useTheme() {
  return {
    theme,
    toggleTheme: () => apply(theme.value === 'dark' ? 'light' : 'dark'),
    setTheme: apply,
  }
}