/**
 * 词云图:词频统计 + 矩形碰撞的螺旋布局,全部纯函数便于测试。
 * 英文按单词(含连字符/撇号)、中文按单字切分;停用词过滤,频次降序。
 */

const DEFAULT_STOPWORDS = new Set([
  'the', 'and', 'a', 'an', 'of', 'to', 'in', 'is', 'are', 'was', 'were', 'be', 'been', 'it', 'its',
  'this', 'that', 'these', 'those', 'for', 'on', 'with', 'as', 'at', 'by', 'from', 'or', 'not',
  'but', 'we', 'you', 'he', 'she', 'they', 'i', 'me', 'my', 'our', 'your', 'his', 'her', 'their',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'can', 'could', 'should', 'may',
  's', 't', 'd', 'll', 're', 've',
])

const CJK_RE = /[\u4e00-\u9fa5]/

/**
 * 词频统计。
 * @param {string} text 原文
 * @param {{mode:'word'|'char', stopwords?:string[], max?:number}} p
 * @returns {{items:{text:string,count:number}[], total:number}} total 为计入统计的词数
 */
export function tokenize(text, { mode = 'word', stopwords = [], max = 120 } = {}) {
  const stop = new Set(stopwords.length ? stopwords : DEFAULT_STOPWORDS)
  let tokens
  if (mode === 'char') {
    tokens = (text.match(/[\u4e00-\u9fa5]/g) || [])
  } else {
    tokens = (text.toLowerCase().match(/[a-z0-9\u4e00-\u9fa5][a-z0-9\u4e00-\u9fa5'-]*/g) || [])
  }
  const freq = new Map()
  let total = 0
  for (const t of tokens) {
    if (stop.has(t)) continue
    if (t.length < 2 && !CJK_RE.test(t)) continue // 单个英文数字字母不成词
    freq.set(t, (freq.get(t) || 0) + 1)
    total++
  }
  const items = [...freq.entries()]
    .map(([w, count]) => ({ text: w, count }))
    // 平局按 UTF-16 码点排序:localeCompare 在不同 ICU 环境下顺序不同,会导致跨平台结果漂移
    .sort((a, b) => b.count - a.count || (a.text < b.text ? -1 : a.text > b.text ? 1 : 0))
    .slice(0, max)
  return { items, total }
}

/**
 * 螺旋布局:按频次从大到小放置,阿基米德螺旋找第一个不与已放置矩形重叠的位置。
 * @param {{items:{text:string,count:number}[], total:number}} t tokenize 的返回
 * @param {{width:number, height:number, minFont?:number, maxFont?:number}} o
 *  rotateRatio 参数已移除:旋转改为按序号固定间隔,保证同一输入布局稳定可复现
 * @returns {{placed:Array<{text:string,count:number,size:number,rotate:number,x:number,y:number,w:number,h:number}>, skipped:number}}
 *  x/y 为词中心的画布坐标;size 为字号;w/h 为含旋转的包围盒;skipped 为放不下的词数
 */
export function layoutCloud({ items }, { width, height, minFont = 12, maxFont = 64 }) {
  if (!items.length || !(width > 0) || !(height > 0)) return { placed: [], skipped: 0 }

  const max = items[0].count
  const min = items[items.length - 1].count
  const sizeOf = (count) => {
    // sqrt 标度:频次差被压平一些,小词仍可读;频次全相同时取中档字号
    const r = max === min ? 0.5 : Math.sqrt((count - min) / (max - min))
    return Math.round(minFont + r * (maxFont - minFont))
  }
  // 字符宽高近似:中文按 1em,英文/数字按 0.55em,加 15% 余量
  const measure = (text, size) => {
    let units = 0
    for (const ch of text) units += ch.charCodeAt(0) > 0x2e7f ? 1 : 0.55
    return { w: units * size * 1.15, h: size * 1.25 }
  }
  const cx = width / 2
  const cy = height / 2
  const placed = []
  let skipped = 0
  let i = 0

  for (const item of items) {
    const size = sizeOf(item.count)
    // 固定间隔让部分词转 90°,布局确定可测;长词不转(容易放不下)
    const rotate = i % 7 === 3 && item.text.length <= 6 ? 90 : 0
    const { w, h } = measure(item.text, size)
    const box = rotate === 90 ? { w: h, h: w } : { w, h }
    const pos = findSpot(box, cx, cy, placed, width, height)
    if (!pos) {
      skipped++
      continue
    }
    placed.push({ ...item, size, rotate, x: pos.x, y: pos.y, w: box.w, h: box.h })
    i++
  }
  return { placed, skipped }
}

/** 从中心向外按螺旋步进,最多绕到画布外为止;找不到容身之处返回 null */
function findSpot(box, cx, cy, placed, width, height) {
  const step = 4
  const maxR = Math.hypot(cx, cy) + Math.max(box.w, box.h)
  let theta = 0
  for (let r = 0; r <= maxR; r += step) {
    const x = cx + Math.cos(theta) * r
    const y = cy + Math.sin(theta) * r
    theta += 0.35
    if (!fits(box, x, y, placed, width, height)) continue
    return { x, y }
  }
  return null
}

function fits(box, x, y, placed, width, height) {
  const l = x - box.w / 2
  const t = y - box.h / 2
  if (l < 0 || t < 0 || l + box.w > width || t + box.h > height) return false
  for (const p of placed) {
    const pl = p.x - p.w / 2 - 2
    const pt = p.y - p.h / 2 - 2
    if (l < pl + p.w + 2 && l + box.w > pl && t < pt + p.h + 2 && t + box.h > pt) return false
  }
  return true
}
