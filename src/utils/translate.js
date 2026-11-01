/**
 * 文本翻译:MyMemory 免费翻译 API(无密钥,匿名约 5000 字节/日)。
 * 每次请求上限 500 UTF-8 字节(中文 3 字节/字,约 166 个汉字);
 * 结果按 (源语言,目标语言,文本) 缓存 24 小时。
 */

export const LANGS = [
  { code: 'zh-CN', name: '简体中文' },
  { code: 'zh-TW', name: '繁体中文' },
  { code: 'en', name: '英语' },
  { code: 'ja', name: '日语' },
  { code: 'ko', name: '韩语' },
  { code: 'fr', name: '法语' },
  { code: 'de', name: '德语' },
  { code: 'es', name: '西班牙语' },
  { code: 'pt', name: '葡萄牙语' },
  { code: 'it', name: '意大利语' },
  { code: 'ru', name: '俄语' },
  { code: 'ar', name: '阿拉伯语' },
  { code: 'th', name: '泰语' },
  { code: 'vi', name: '越南语' },
  { code: 'id', name: '印尼语' },
  { code: 'nl', name: '荷兰语' },
]

export const MAX_BYTES = 500
const TTL_MS = 24 * 60 * 60 * 1000
const API = 'https://api.mymemory.translated.net/get'

/** UTF-8 字节数(MyMemory 按字节计费) */
export function byteLength(text) {
  return new TextEncoder().encode(String(text || '')).length
}

export function langName(code) {
  return LANGS.find((l) => l.code === code)?.name || code
}

function cacheKey(text, from, to) {
  return `toolbox-trans:${from}|${to}|${text}`
}

function readCache(key, now) {
  try {
    const v = JSON.parse(localStorage.getItem(key) || 'null')
    if (v && typeof v.fetchedAt === 'number' && now - v.fetchedAt < TTL_MS) return v
  } catch { /* 忽略 */ }
  return null
}

/** 不限时效读取(断网兜底用,过期缓存也比空白强) */
function readCacheStale(key) {
  try {
    const v = JSON.parse(localStorage.getItem(key) || 'null')
    if (v && typeof v.fetchedAt === 'number') return v
  } catch { /* 忽略 */ }
  return null
}

function writeCache(key, data, now) {
  try {
    localStorage.setItem(key, JSON.stringify({ ...data, fetchedAt: now }))
  } catch { /* 忽略 */ }
}

/**
 * 翻译。
 * @returns {Promise<{error:string, text:string, match:number, fromCache:boolean}>}
 */
export async function translate(text, from, to, { now = Date.now() } = {}) {
  const t = String(text || '')
  const trimmed = t.trim()
  if (!trimmed) return { error: '请输入要翻译的内容', text: '', match: 0, fromCache: false }
  if (from === to) return { error: '源语言与目标语言相同', text: '', match: 0, fromCache: false }
  const bytes = byteLength(trimmed)
  if (bytes > MAX_BYTES) {
    return { error: `内容超长:${bytes} 字节,单次上限 ${MAX_BYTES} 字节(中文约 ${Math.floor(MAX_BYTES / 3)} 字),请分段翻译`, text: '', match: 0, fromCache: false }
  }

  const key = cacheKey(trimmed, from, to)
  const cached = readCache(key, now)
  if (cached) return { error: '', text: cached.text, match: cached.match, fromCache: true }

  try {
    const res = await fetch(`${API}?q=${encodeURIComponent(trimmed)}&langpair=${encodeURIComponent(from)}|${encodeURIComponent(to)}`)
    if (!res.ok) throw new Error(`翻译服务返回 ${res.status}`)
    const data = await res.json()
    if (data.quotaFinished) throw new Error('今日免费额度已用完(匿名约 5000 字节/日),明天再试或换网络')
    if (data.responseStatus !== 200 || !data.responseData?.translatedText) {
      throw new Error(data.responseDetails || '翻译服务未返回结果')
    }
    const out = { text: data.responseData.translatedText, match: data.responseData.match ?? 0 }
    writeCache(key, out, now)
    return { error: '', ...out, fromCache: false }
  } catch (e) {
    const cached = readCacheStale(key)
    if (cached) return { error: `网络获取失败(${e.message}),已回退本地缓存`, text: cached.text, match: cached.match, fromCache: true }
    return { error: `翻译失败:${e.message}。请检查网络后重试;本工具需要联网。`, text: '', match: 0, fromCache: false }
  }
}
