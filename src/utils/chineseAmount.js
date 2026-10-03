/**
 * 数字金额 → 人民币中文大写(财务规范)。
 * 支持 0 ~ 9999 亿,精确到分;超过上限或非法输入返回 error。
 */

const DIGITS = '零壹贰叁肆伍陆柒捌玖'
// 与 padStart(4) 后的下标一一对应:0=仟 1=佰 2=拾 3=个
const INNER_UNITS = ['仟', '佰', '拾']
const SECTION_UNITS = ['', '万', '亿']

// 上限 9999 亿 ≈ 13 位整数,分节后最多 4 节但只用 3 个节单位
const MAX_INTEGER = 9999_9999_9999

function readGroup(n) {
  // 读一个 1~9999 的四位数组内节,如 1001 → 壹仟零壹,1010 → 壹仟零壹拾
  const digits = String(n).padStart(4, '0').split('').map(Number)
  let out = ''
  let zeroPending = false
  for (let i = 0; i < 4; i++) {
    const d = digits[i]
    if (d === 0) {
      if (out) zeroPending = true // 已有高位才需要补零,前导零忽略
    } else {
      if (zeroPending) {
        out += '零'
        zeroPending = false
      }
      out += DIGITS[d]
      if (i < 3) out += INNER_UNITS[i]
    }
  }
  return { text: out, endsWithZero: zeroPending }
}

function integerToChinese(n) {
  if (n === 0) return '零'
  // 从右往左每 4 位分节
  const groups = []
  let v = n
  while (v > 0) {
    groups.push(v % 10000)
    v = Math.floor(v / 10000)
  }
  let out = ''
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i]
    if (g === 0) {
      // 整节为零(如 1,0000,0001 中间的万节):若低位还有数字,需要留一个零
      if (i > 0 && groups[i - 1] > 0 && out && !out.endsWith('零')) out += '零'
      continue
    }
    const { text } = readGroup(g)
    // 中间节不足 4 位(如 1,0001 → 壹万零壹)或上一节以零结尾时补零
    if (out && g < 1000 && !out.endsWith('零')) out += '零'
    out += text + SECTION_UNITS[i]
  }
  return out
}

export function toChineseAmount(input) {
  const s = String(input ?? '').trim().replace(/[,，\s]/g, '')
  if (!s) return { text: '', error: '' }
  if (!/^\d+(\.\d{1,2})?$/.test(s)) {
    return { text: '', error: '格式不正确:请输入非负数字金额,最多两位小数,如 1234.56' }
  }
  const [intPart, decPart = ''] = s.split('.')
  const n = Number(intPart)
  if (n > MAX_INTEGER) return { text: '', error: '金额超过 9999 亿,超出本工具范围' }

  if (n === 0 && (!decPart || Number(decPart) === 0)) {
    return { text: '零圆整', error: '' }
  }

  let out = ''
  if (n > 0) out += integerToChinese(n) + '圆'

  const jiao = Number(decPart[0] ?? 0)
  const fen = Number(decPart[1] ?? 0)
  if (jiao === 0 && fen === 0) {
    out += '整'
  } else {
    // 整数部分非零但角为零、分非零:规范要求补零,如 1.05 → 壹圆零伍分
    if (n > 0 && jiao === 0 && fen > 0) out += '零'
    if (jiao > 0) out += DIGITS[jiao] + '角'
    if (fen > 0) out += DIGITS[fen] + '分'
    if (fen === 0) out += '整'
  }
  return { text: out, error: '' }
}