/**
 * SRT / WebVTT 字幕解析、互转与时间轴变换。
 * 内部统一用毫秒时间轴:cues = [{ start, end, text }](start/end 为整数毫秒,text 可含换行)。
 * 解析刻意宽容(序号行可缺、时间码可省小时、VTT 的 cue 设置忽略),导出固定为标准格式。
 */

/** "00:01:02,345" / "01:02,345" / "00:01:02.345" → 毫秒;非法抛出可读错误 */
export function parseTimecode(s) {
  const m = /^(?:(\d+):)?(\d{1,2}):(\d{1,2})[,.](\d{1,3})$/.exec(String(s).trim())
  if (!m) throw new Error(`时间码不合法:「${s}」(应为 时:分:秒,毫秒)`)
  const [, h = '0', min, sec, ms] = m
  return ((+h * 60 + +min) * 60 + +sec) * 1000 + +(ms.padEnd(3, '0'))
}

/** 毫秒 → "hh:mm:ss,mmm"(SRT)或 "hh:mm:ss.mmm"(VTT);负值按 0 处理 */
export function formatTimecode(ms, { vtt = false } = {}) {
  const total = Math.max(0, Math.round(ms))
  const h = Math.floor(total / 3600000)
  const m = Math.floor((total % 3600000) / 60000)
  const s = Math.floor((total % 60000) / 1000)
  const milli = total % 1000
  const pad = (n, w = 2) => String(n).padStart(w, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}${vtt ? '.' : ','}${pad(milli, 3)}`
}

function parseTimingLine(line, vtt) {
  // VTT 的 --> 之后可以跟 cue 设置(坐标等),只取两端时间码
  const parts = line.split('-->')
  if (parts.length !== 2) return null
  const start = parseTimecode(parts[0])
  const end = parseTimecode(parts[1].trim().split(/\s+/)[0])
  return { start, end, vtt }
}

/**
 * 解析字幕(SRT 与 WebVTT 自动识别)。
 * @returns {{format:'srt'|'vtt', cues:{start:number,end:number,text:string}[]}}
 */
export function parseSubtitles(input) {
  const text = String(input ?? '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim()
  if (!text) throw new Error('内容为空')
  const isVtt = /^WEBVTT/i.test(text)
  const blocks = text.split(/\n{2,}/)
  const cues = []
  for (const block of blocks) {
    const lines = block.split('\n').filter((l, i, arr) => !(i === 0 && l.trim() === '' && arr.length === 1))
    const timingIdx = lines.findIndex((l) => l.includes('-->'))
    if (timingIdx < 0) continue // WEBVTT 头 / NOTE / STYLE 等非正文档块
    const timing = parseTimingLine(lines[timingIdx], isVtt)
    if (!timing) continue
    const body = lines.slice(timingIdx + 1).join('\n').trim()
    if (!body) continue // 空字幕块无意义,跳过
    if (timing.end < timing.start) throw new Error(`时间轴起止倒置:${lines[timingIdx].trim()}`)
    cues.push({ start: timing.start, end: timing.end, text: body })
  }
  if (!cues.length) throw new Error(isVtt ? '没有解析出任何字幕(VTT 需包含 "-->" 时间轴行)' : '没有解析出任何字幕(需为 SRT 或 VTT 格式)')
  return { format: isVtt ? 'vtt' : 'srt', cues }
}

/** cues → SRT 文本(序号从 1 起) */
export function toSrt(cues) {
  return cues
    .map((c, i) => `${i + 1}\n${formatTimecode(c.start)} --> ${formatTimecode(c.end)}\n${c.text}`)
    .join('\n\n') + '\n'
}

/** cues → WebVTT 文本(带 WEBVTT 头) */
export function toVtt(cues) {
  return 'WEBVTT\n\n' + cues
    .map((c) => `${formatTimecode(c.start, { vtt: true })} --> ${formatTimecode(c.end, { vtt: true })}\n${c.text}`)
    .join('\n\n') + '\n'
}

/** 时间轴整体平移 deltaMs;负平移把起点截断到 0(字幕不会跑到时间轴外) */
export function shiftCues(cues, deltaMs) {
  return cues.map((c) => ({
    ...c,
    start: Math.max(0, c.start + deltaMs),
    end: Math.max(0, c.end + deltaMs),
  }))
}

/** 时间轴缩放(factor > 0;常用于帧率修正,如 25fps → 23.976fps 乘 25/23.976) */
export function scaleCues(cues, factor) {
  if (!(factor > 0)) throw new Error('缩放系数必须大于 0')
  return cues.map((c) => ({ ...c, start: Math.round(c.start * factor), end: Math.round(c.end * factor) }))
}

/** 字幕总时长(最后一条结束时间,毫秒) */
export function totalDuration(cues) {
  return cues.reduce((max, c) => Math.max(max, c.end), 0)
}
