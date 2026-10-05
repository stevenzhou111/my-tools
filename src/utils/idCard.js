/**
 * 中国居民身份证号(18 位)解析与校验(GB 11643-1999)。
 * 只做格式与校验位验证、提取出生日期 / 性别 / 省级行政区,
 * 市县区代码表不内置(全表数万条且每年更新,超出本工具范围)。
 */

const WEIGHTS = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
const CHECK_CHARS = '10X98765432'

export const PROVINCES = {
  11: '北京市', 12: '天津市', 13: '河北省', 14: '山西省', 15: '内蒙古自治区',
  21: '辽宁省', 22: '吉林省', 23: '黑龙江省',
  31: '上海市', 32: '江苏省', 33: '浙江省', 34: '安徽省', 35: '福建省', 36: '江西省', 37: '山东省',
  41: '河南省', 42: '湖北省', 43: '湖南省', 44: '广东省', 45: '广西壮族自治区', 46: '海南省',
  50: '重庆市', 51: '四川省', 52: '贵州省', 53: '云南省', 54: '西藏自治区',
  61: '陕西省', 62: '甘肃省', 63: '青海省', 64: '宁夏回族自治区', 65: '新疆维吾尔自治区',
  71: '台湾省', 81: '香港特别行政区', 82: '澳门特别行政区',
}

/** 计算前 17 位的校验位(输入须为 17 位数字串) */
export function checkDigit(id17) {
  if (!/^\d{17}$/.test(String(id17))) return null
  const sum = [...id17].reduce((s, d, i) => s + d * WEIGHTS[i], 0)
  return CHECK_CHARS[sum % 11]
}

/**
 * 解析 18 位身份证号。
 * @returns {{ ok:boolean, error?:string, province?:string, birth?:string, gender?:string, age?:number, sexCode?:string, valid?:boolean }}
 */
export function parseIdCard(id) {
  const s = String(id ?? '').trim().toUpperCase()
  if (!/^\d{17}[\dX]$/.test(s)) {
    return { ok: false, error: '格式:18 位,前 17 位数字,末位数字或 X' }
  }
  const province = PROVINCES[s.slice(0, 2)]
  if (!province) return { ok: false, error: `前两位 ${s.slice(0, 2)} 不是已知的省级行政区代码` }

  const birth = s.slice(6, 14)
  const y = +birth.slice(0, 4)
  const m = +birth.slice(4, 6)
  const d = +birth.slice(6, 8)
  const date = new Date(y, m - 1, d)
  if (
    date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d ||
    y < 1900 || date > new Date()
  ) {
    return { ok: false, error: `出生日期 ${birth} 不是有效日期` }
  }

  const expected = checkDigit(s.slice(0, 17))
  if (s[17] !== expected) {
    return { ok: false, error: `校验位不符:末位应为 ${expected},实际是 ${s[17]}`, valid: false }
  }

  const age = Math.floor((Date.now() - date.getTime()) / (365.2425 * 24 * 3600 * 1000))
  return {
    ok: true,
    province,
    birth: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    gender: +s[16] % 2 === 1 ? '男' : '女',
    sexCode: s[16],
    age,
    valid: true,
  }
}

/** 打码展示:保留前 6 位与后 4 位(常见合规做法) */
export function maskIdCard(id) {
  const s = String(id ?? '').trim().toUpperCase()
  if (!/^\d{17}[\dX]$/.test(s)) return null
  return s.slice(0, 6) + '********' + s.slice(14)
}
