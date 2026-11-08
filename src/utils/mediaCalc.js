/**
 * 码率/体积/下载时间换算:视频剪辑与分发常用。
 * 口径统一:kbps = kilobit/s,MB = 兆字节(1 MB = 8 × 1024 kbit)。
 */

/** 时长(秒)× 总码率(kbps)→ 体积(MB) */
export function sizeMB(durationSec, totalKbps) {
  if (!(durationSec > 0) || !(totalKbps > 0)) throw new Error('时长与码率必须大于 0')
  return (durationSec * totalKbps) / 8 / 1024
}

/** 体积(MB)÷ 时长(秒)→ 总码率(kbps) */
export function bitrateKbps(sizeMB, durationSec) {
  if (!(durationSec > 0) || !(sizeMB > 0)) throw new Error('时长与体积必须大于 0')
  return (sizeMB * 8 * 1024) / durationSec
}

/** 体积(MB)÷ 带宽(Mbps)→ 下载秒数 */
export function downloadSeconds(sizeMB, mbps) {
  if (!(mbps > 0)) throw new Error('带宽必须大于 0')
  return (sizeMB * 8) / mbps
}

/** 秒 → 「x 小时 y 分 z 秒」精简文案 */
export function humanSeconds(sec) {
  const s = Math.round(sec)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  if (h) return `${h} 小时 ${m} 分 ${r} 秒`
  if (m) return `${m} 分 ${r} 秒`
  return `${r} 秒`
}
