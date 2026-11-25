const MIME_BY_EXT = {
  txt: 'text/plain',
  md: 'text/markdown',
  csv: 'text/csv',
  html: 'text/html',
  htm: 'text/html',
  css: 'text/css',
  js: 'text/javascript',
  json: 'application/json',
  xml: 'application/xml',
  yaml: 'application/yaml',
  yml: 'application/yaml',
  pdf: 'application/pdf',
  zip: 'application/zip',
  gz: 'application/gzip',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  otf: 'font/otf',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  ogg: 'audio/ogg',
  mp4: 'video/mp4',
  webm: 'video/webm',
  wasm: 'application/wasm',
}

const EXT_BY_MIME = {
  'text/plain': 'txt',
  'text/markdown': 'md',
  'text/csv': 'csv',
  'text/html': 'html',
  'text/css': 'css',
  'text/javascript': 'js',
  'application/json': 'json',
  'application/xml': 'xml',
  'application/yaml': 'yaml',
  'application/pdf': 'pdf',
  'application/zip': 'zip',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
  'video/mp4': 'mp4',
  'application/wasm': 'wasm',
}

export function guessMime(filename = '') {
  const ext = String(filename).toLowerCase().match(/\.([a-z0-9]+)$/)?.[1]
  return MIME_BY_EXT[ext] || 'application/octet-stream'
}

export function extensionForMime(mime = '') {
  const base = String(mime).split(';')[0].trim().toLowerCase()
  if (EXT_BY_MIME[base]) return EXT_BY_MIME[base]
  const sub = base.split('/')[1]?.split('+')[0]
  return sub && /^[a-z0-9-]+$/.test(sub) ? sub : 'bin'
}

export function fileNameForMime(mime, base = 'decoded') {
  return `${base || 'decoded'}.${extensionForMime(mime)}`
}

export function buildDataUrl(mime, base64) {
  return `data:${mime || 'application/octet-stream'};base64,${base64}`
}

/** 解析 Data URL;纯 base64 也接受,mime 为空 */
export function splitDataUrl(input) {
  const s = String(input ?? '').trim()
  if (!s) return { mime: '', base64: '', error: '内容为空' }
  if (!/^data:/i.test(s)) return { mime: '', base64: s, error: '' }

  const comma = s.indexOf(',')
  if (comma < 0) return { mime: '', base64: '', error: 'Data URL 缺少逗号分隔' }
  const meta = s.slice(5, comma)
  if (!/;base64$/i.test(meta)) {
    return { mime: '', base64: '', error: '仅支持 base64 编码的 Data URL' }
  }
  const mime = meta.replace(/;base64$/i, '').split(';')[0] || 'application/octet-stream'
  return { mime, base64: s.slice(comma + 1), error: '' }
}

/** 宽松解码:忽略空白、兼容 URL-safe 与缺失填充 */
export function decodeBase64(input) {
  let s = String(input ?? '').replace(/\s+/g, '')
  if (!s) return { bytes: null, error: 'Base64 内容为空' }
  s = s.replace(/-/g, '+').replace(/_/g, '/')
  if (s.length % 4 === 1) return { bytes: null, error: 'Base64 长度不合法' }
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(s)) return { bytes: null, error: '含非法字符,不是有效的 Base64' }
  s = s.replace(/=+$/, '')
  s = s.padEnd(Math.ceil(s.length / 4) * 4, '=')
  try {
    const bin = atob(s)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return { bytes, error: '' }
  } catch {
    return { bytes: null, error: 'Base64 解码失败' }
  }
}