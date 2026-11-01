/**
 * 银行卡号校验:Luhn 算法 + 卡组织 BIN 识别。
 * 纯前端算法校验,只验证「格式可能合法」,不代表卡真实存在或可用。
 */

/** Luhn 校验(ISO/IEC 7812-1):从右往左,奇数位照加、偶数位乘 2 超过 9 减 9 */
export function luhnValid(numStr) {
  const s = String(numStr || '').replace(/\D/g, '')
  if (s.length < 12) return false
  let sum = 0
  let dbl = false
  for (let i = s.length - 1; i >= 0; i--) {
    let d = s.charCodeAt(i) - 48
    if (dbl) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
    dbl = !dbl
  }
  return sum % 10 === 0
}

const BRANDS = [
  { id: 'unionpay', name: '银联 UnionPay', lens: [16, 17, 18, 19], match: (n) => /^62/.test(n) },
  { id: 'visa', name: 'Visa', lens: [13, 16, 19], match: (n) => n.startsWith('4') },
  { id: 'mastercard', name: 'Mastercard', lens: [16], match: (n) => /^(5[1-5]|222[1-9]|22[3-9]\d|2[3-6]\d{2}|27[01]\d|2720)/.test(n) },
  { id: 'amex', name: 'American Express', lens: [15], match: (n) => /^3[47]/.test(n) },
  { id: 'jcb', name: 'JCB', lens: [16, 17, 18, 19], match: (n) => /^35(2[89]|[3-8]\d)/.test(n) },
  { id: 'discover', name: 'Discover', lens: [16, 17, 18, 19], match: (n) => /^(6011|65|64[4-9])/.test(n) },
  { id: 'diners', name: 'Diners Club', lens: [14], match: (n) => /^(3(?:0[0-5]|36|38))/.test(n) },
]

/** BIN 识别:返回卡组织信息;无法识别时 id 为 unknown */
export function cardBrand(numStr) {
  const s = String(numStr || '').replace(/\D/g, '')
  if (!s) return null
  return BRANDS.find((b) => b.match(s)) || { id: 'unknown', name: '未知卡组织', lens: [] }
}

/** 该号码的位数是否符合卡组织规范 */
export function lengthOk(numStr) {
  const s = String(numStr || '').replace(/\D/g, '')
  const b = cardBrand(s)
  if (!s || !b.lens.length) return null // 未知组织无法判定
  return b.lens.includes(s.length)
}

/** 按组织习惯分组展示:Amex 4-6-5,其余每 4 位 */
export function formatCard(numStr) {
  const s = String(numStr || '').replace(/\D/g, '')
  if (cardBrand(s).id === 'amex') {
    return [s.slice(0, 4), s.slice(4, 10), s.slice(10, 15)].filter(Boolean).join(' ')
  }
  return s.replace(/(\d{4})(?=\d)/g, '$1 ')
}

/** 打码展示:保留前 6 后 4(BIN + 末位),星号数量随卡长变化,段间加空格便于阅读 */
export function maskCard(numStr) {
  const s = String(numStr || '').replace(/\D/g, '')
  if (s.length < 11) return formatCard(s)
  return `${s.slice(0, 6)} ${'*'.repeat(s.length - 10)} ${s.slice(-4)}`
}

/** 识别主流程:一次性给出全部信息 */
export function checkCard(numStr) {
  const s = String(numStr || '').replace(/\D/g, '')
  if (!s) return { error: '请输入卡号', data: null }
  if (s.length < 12) return { error: '卡号太短:常见卡号 14~19 位', data: null }
  const brand = cardBrand(s)
  return {
    error: '',
    data: {
      digits: s,
      luhn: luhnValid(s),
      brand,
      lengthOk: lengthOk(s),
      formatted: formatCard(s),
      masked: maskCard(s),
    },
  }
}
