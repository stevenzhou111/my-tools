import { ref } from 'vue'

/**
 * 深浅主题:模块级单例,App 顶栏与命令面板动作共用同一份状态。
 */
const theme = ref(
  typeof document !== 'undefined' ? document.documentElement.dataset.theme || 'light' : 'light',
)

const THEME_COLOR = { light: '#f4f5fb', dark: '#0f1117' }

function syncThemeColorMeta(next) {
  // 用户手动切主题时同步地址栏配色:去掉 media 限定,让 meta 直接跟随所选主题
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
    m.removeAttribute('media')
    m.setAttribute('content', THEME_COLOR[next] || THEME_COLOR.light)
  })
}

function apply(next) {
  theme.value = next
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = next
    try {
      syncThemeColorMeta(next)
    } catch {
      /* 无关紧要的展示层同步,失败不阻塞切主题 */
    }
  }
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