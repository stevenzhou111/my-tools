/**
 * 文本转拼音:复用仓库已有的 pinyin-pro(命令面板搜索词典同源)。
 * 支持全拼(带/不带声调)、首字母,多音字按词组语境识别。
 */
import { pinyin } from 'pinyin-pro'

export const PINYIN_MODES = [
  { id: 'tone', label: '全拼(带声调)' },
  { id: 'num', label: '全拼(声调数字)' },
  { id: 'normal', label: '全拼(无声调)' },
  { id: 'first', label: '首字母' },
]

/** @param {string} text @param {string} mode PINYIN_MODES 之一 */
export function toPinyin(text, mode = 'tone') {
  const s = String(text ?? '')
  if (!s.trim()) return ''
  // nonZh consecutive:非中文字符原样拼接,不逐字加空格
  if (mode === 'first') return pinyin(s, { pattern: 'first', toneType: 'none', type: 'string', nonZh: 'consecutive' })
  if (mode === 'num') return pinyin(s, { pattern: 'pinyin', toneType: 'num', type: 'string', nonZh: 'consecutive' })
  if (mode === 'normal') return pinyin(s, { pattern: 'pinyin', toneType: 'none', type: 'string', nonZh: 'consecutive' })
  return pinyin(s, { pattern: 'pinyin', toneType: 'symbol', type: 'string', nonZh: 'consecutive' })
}
