import OpenCC from 'opencc-js'

export const ZH_MODES = [
  { id: 's2t', label: '简体 → 繁体(台湾)', from: 'cn', to: 'tw' },
  { id: 's2twp', label: '简体 → 繁体(台湾用语)', from: 'cn', to: 'twp' },
  { id: 's2hk', label: '简体 → 繁体(香港)', from: 'cn', to: 'hk' },
  { id: 't2s', label: '繁体 → 简体(台湾)', from: 'twp', to: 'cn' },
  { id: 'hk2s', label: '繁体 → 简体(香港)', from: 'hk', to: 'cn' },
]

const cache = new Map()

export function convertZh(text, modeId) {
  const input = String(text ?? '')
  if (!input.trim()) return { text: '', error: '' }
  const mode = ZH_MODES.find((m) => m.id === modeId)
  if (!mode) return { text: '', error: '未知的转换方向' }
  try {
    let convert = cache.get(mode.id)
    if (!convert) {
      convert = OpenCC.Converter({ from: mode.from, to: mode.to })
      cache.set(mode.id, convert)
    }
    return { text: convert(input), error: '' }
  } catch (e) {
    return { text: '', error: '转换失败:' + (e.message || e) }
  }
}