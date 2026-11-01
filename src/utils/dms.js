/**
 * 地理坐标格式转换:十进制度(DD)↔ 度分秒(DMS)。
 * 纬度 0~90(N/S),经度 0~180(E/W);秒保留 3 位小数(约 0.1 米精度)。
 */

const HEMI = {
  lat: ['N', 'S'],
  lon: ['E', 'W'],
}

/**
 * 十进制度 → 度分秒。
 * @param {number} dd 十经度值(负数表示南纬/西经)
 * @param {'lat'|'lon'} kind
 * @returns {{error:string, data:object|null}}
 */
export function ddToDms(dd, kind = 'lat') {
  const v = Number(dd)
  const limit = kind === 'lat' ? 90 : 180
  if (!Number.isFinite(v)) return { error: '请输入数字', data: null }
  if (Math.abs(v) > limit) return { error: `超出范围:纬度 ±90、经度 ±180`, data: null }
  const abs = Math.abs(v)
  let deg = Math.floor(abs)
  let min = Math.floor((abs - deg) * 60)
  let sec = ((abs - deg) * 60 - min) * 60
  // 秒四舍五入到 3 位可能进位到 60,向分/度进位
  sec = Math.round(sec * 1000) / 1000
  if (sec >= 60) { sec -= 60; min += 1 }
  if (min >= 60) { min -= 60; deg += 1 }
  const hemi = HEMI[kind][v < 0 ? 1 : 0]
  return {
    error: '',
    data: {
      deg,
      min,
      sec,
      hemi,
      text: `${deg}°${String(min).padStart(2, '0')}′${sec.toFixed(3).padStart(6, '0')}″${hemi}`,
      compact: `${deg} ${String(min).padStart(2, '0')} ${sec.toFixed(3).padStart(6, '0')} ${hemi}`,
      ddRound: +v.toFixed(6),
    },
  }
}

/**
 * 度分秒 → 十进制度。
 * @param {{deg:number, min:number, sec:number, hemi:string}} p hemi 支持 N/S/E/W 与中文
 * @returns {{error:string, data:object|null}}
 */
export function dmsToDd({ deg, min = 0, sec = 0, hemi }) {
  const H = String(hemi || '').trim().toUpperCase()
  if (!['N', 'S', 'E', 'W'].includes(H)) return { error: '请选择半球(N/S/E/W)', data: null }
  const isLat = H === 'N' || H === 'S'
  const limit = isLat ? 90 : 180
  const d = Number(deg), m = Number(min), s = Number(sec)
  if (![d, m, s].every(Number.isFinite)) return { error: '度/分/秒需要是数字', data: null }
  if (d < 0 || m < 0 || s < 0) return { error: '度分秒使用非负数值,方向由半球表示', data: null }
  if (m >= 60 || s >= 60) return { error: '分与秒需在 0~60 之间(不含 60)', data: null }
  const dd = d + m / 60 + s / 3600
  if (dd > limit) return { error: `超出范围:纬度最大 90°、经度最大 180°`, data: null }
  const value = +((H === 'S' || H === 'W') ? -dd : dd).toFixed(6)
  return {
    error: '',
    data: {
      dd: value,
      text: String(value),
      // 反向自检:转回 DMS 应与输入一致(容差 0.0005 秒)
      roundTrip: ddToDms(value, isLat ? 'lat' : 'lon').data?.text,
    },
  }
}

/** 自由文本解析:"31°13'45.2"N / 31 13 45.2 N / 北纬31度13分45秒" 等 */
export function parseDmsText(text) {
  const s = String(text || '').trim()
  if (!s) return null
  // 半球:字母或中文,可出现在首尾
  const hemiM = /([NSEWnsew]|[东西南北])/.exec(s.replace(/北纬/g, 'N').replace(/南纬/g, 'S').replace(/东经/g, 'E').replace(/西经/g, 'W'))
  if (!hemiM) return null
  const hemi = hemiM[1].toUpperCase().replace('东', 'E').replace('西', 'W').replace('南', 'S').replace('北', 'N')
  const nums = s.replace(/[^0-9. ]/g, ' ').split(/\s+/).filter(Boolean).map(Number)
  if (!nums.length || nums.length > 3) return null
  return { deg: nums[0], min: nums[1] || 0, sec: nums[2] || 0, hemi }
}
