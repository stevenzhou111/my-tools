import { useToolPrefs } from './prefs'

/**
 * 收藏(含最近使用)的 JSON 文件导出/导入,换机迁移用。
 * 从 HomeView 的内联实现抽出;导入失败抛出 message 可直接展示的错误。
 */
export function exportFavoritesFile() {
  const { exportPrefs } = useToolPrefs()
  const blob = new Blob([exportPrefs()], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `toolbox-favorites-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

export function importFavoritesFile(file) {
  const { importPrefs } = useToolPrefs()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        resolve({ added: importPrefs(String(reader.result || '')).added })
      } catch (err) {
        reject(err instanceof Error ? err : new Error('导入失败'))
      }
    }
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsText(file)
  })
}
