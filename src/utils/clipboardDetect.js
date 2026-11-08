/**
 * 剪贴板内容类型识别(首页「识别剪贴板内容,推荐工具」)。
 * detectContentType 是纯函数,便于单测覆盖;读取剪贴板的胶水在 detectFromClipboard。
 */

export function detectContentType(text) {
  const t = text.trim()
  if (!t || t.length > 100000) return null
  // 裸数字/字符串等标量也是合法 JSON,但把时间戳推荐到 JSON 工具毫无意义:
  // 只把对象/数组形态当 JSON,纯数字落到下方时间戳分支
  if (/^[{\[]/.test(t)) {
    try {
      JSON.parse(t)
      return { label: 'JSON 数据', toolId: 'json' }
    } catch { /* 继续尝试其他类型 */ }
  }
  if (/^eyJ[\w-]+\.[\w-]+\.[\w-]*$/.test(t)) return { label: 'JWT Token', toolId: 'jwt' }
  if (/^https?:\/\/\S+$/i.test(t)) return { label: 'URL 链接', toolId: 'url-parser' }
  if (/^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(t)) return { label: '颜色值', toolId: 'color' }
  if (
    /^[A-Za-z0-9+/=\s]+$/.test(t) &&
    t.replace(/\s/g, '').length % 4 === 0 &&
    t.replace(/\s/g, '').length > 8 &&
    /[A-Za-z]/.test(t) &&
    /[+/=]/.test(t)
  ) {
    return { label: '疑似 Base64 文本', toolId: 'base64' }
  }
  if (/^\d{13}$/.test(t)) return { label: '毫秒时间戳', toolId: 'timestamp' }
  if (/^\d{10}$/.test(t)) return { label: '秒级时间戳', toolId: 'timestamp' }
  // 图片 dataURL(截图/复制的图片以文本形式出现)→ 二维码解析与图片工具都常用,先推荐解析
  if (/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(t)) return { label: '图片 Data URL', toolId: 'qr-decode' }
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(t)) return { label: 'IPv4 地址', toolId: 'subnet-calc' }
  return null
}

/** 读取剪贴板并识别;命中返回 { hit, preview },未命中/失败抛错(文案可直接展示) */
export async function detectFromClipboard() {
  if (!navigator.clipboard?.readText) {
    throw new Error('当前浏览器不支持读取剪贴板')
  }
  let text = ''
  try {
    text = await navigator.clipboard.readText()
  } catch {
    throw new Error('读取剪贴板被拒绝或失败,请手动复制后重试')
  }
  const hit = detectContentType(text || '')
  if (!hit) {
    throw new Error('没有识别出已知类型(支持 JSON / JWT / URL / 颜色 / Base64 / 时间戳 / IP / 图片链接)')
  }
  return { hit, preview: text.trim().slice(0, 80) }
}
