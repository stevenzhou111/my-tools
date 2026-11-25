/**
 * 中文数字与阿拉伯数字双向转换。
 * 整数全程使用 BigInt,避免超过 Number.MAX_SAFE_INTEGER 后丢精度。
 */

const DIGIT_MAP = {
  零: 0, 〇: 0,
  一: 1, 壹: 1,
  二: 2, 两: 2, 贰: 2, 貳: 2,
  三: 3, 叁: 3, 參: 3,
  四: 4, 肆: 4,
  五: 5, 伍: 5,
  六: 6, 陆: 6, 陸: 6,
  七: 7, 柒: 7,
  八: 8, 捌: 8,
  九: 9, 玖: 9,
}

const SMALL_UNIT_MAP = {
  十: 10, 拾: 10,
  百: 100, 佰: 100,
  千: 1000, 仟: 1000,
}

const BIG_UNIT_MAP = {
  万: 10000n, 萬: 10000n,
  亿: 100000000n, 億: 100000000n,
  兆: 1000000000000n,
  京: 10000000000000000n,
}

const CN_DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']
const GROUP_UNITS = ['', '万', '亿', '兆', '京']
const SMALL_UNIT_LABELS = ['千', '百', '十']
const MAX_INTEGER = 10000n ** BigInt(GROUP_UNITS.length)

function readGroup(n) {
  const digits = String(n).padStart(4, '0').split('').map(Number)
  let out = ''
  let zeroPending = false
  for (let i = 0; i < 4; i++) {
    const d = digits[i]
    if (d === 0) {
      if (out) zeroPending = true
      continue
    }
    if (zeroPending) {
      out += '零'
      zeroPending = false
    }
    out += CN_DIGITS[d]
    if (i < 3) out += SMALL_UNIT_LABELS[i]
  }
  return out
}

function integerToChinese(n) {
  const groups = []
  let v = n
  while (v > 0n) {
    groups.push(Number(v % 10000n))
    v /= 10000n
  }
  let out = ''
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i]
    if (g === 0) {
      if (i > 0 && groups[i - 1] > 0 && out && !out.endsWith('零')) out += '零'
      continue
    }
    // 中间节不足四位(如 1,0001 → 一万零一)需要补零
    if (out && g < 1000 && !out.endsWith('零')) out += '零'
    let groupText = readGroup(g)
    // 最高节以「一十」开头时按口语去掉「一」:12 亿 → 十二亿
    if (!out && groupText.startsWith('一十')) groupText = groupText.slice(1)
    out += groupText + GROUP_UNITS[i]
  }
  return out
}

/** 阿拉伯数字 → 中文小写读法;支持负数、小数与到 9999 京的大数。 */
export function numberToChinese(input) {
  const raw = String(input ?? '').trim().replace(/[,，\s_]/g, '')
  if (!raw) return { text: '', error: '' }
  const m = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(raw)
  if (!m) return { text: '', error: '请输入阿拉伯数字,如 1234.56(不支持科学计数法)' }

  const negative = m[1] === '-'
  const integer = BigInt(m[2])
  const decimal = m[3] ?? ''
  if (integer >= MAX_INTEGER) return { text: '', error: '数字超出范围(最大 9999 京)' }

  let text = integer === 0n ? '零' : integerToChinese(integer)
  if (decimal) text += '点' + [...decimal].map((d) => CN_DIGITS[Number(d)]).join('')
  if (negative && !(integer === 0n && (!decimal || /^0+$/.test(decimal)))) text = '负' + text
  return { text, error: '' }
}

// 口语省略:一百二 = 120,三千五 = 3500,一万二 = 12000;带「零」时不省略(一百零二 = 102)
function takeAbbreviation(text) {
  const m = /([百千万亿兆京])([一二两三四五六七八九])$/.exec(text)
  if (!m) return null
  return { baseText: text.slice(0, -1), unit: m[1], digit: DIGIT_MAP[m[2]] }
}

function abbreviationStep(unit) {
  if (SMALL_UNIT_MAP[unit]) return BigInt(SMALL_UNIT_MAP[unit] / 10)
  return BIG_UNIT_MAP[unit] / 10n
}

function parseInteger(text) {
  const abbr = takeAbbreviation(text)
  const body = abbr ? abbr.baseText : text
  let total = 0n
  let section = 0n
  let number = 0n

  for (const ch of body) {
    if (Object.prototype.hasOwnProperty.call(DIGIT_MAP, ch)) {
      number = number * 10n + BigInt(DIGIT_MAP[ch])
      continue
    }
    if (ch === '廿') {
      section += 20n
      number = 0n
      continue
    }
    if (ch === '卅') {
      section += 30n
      number = 0n
      continue
    }
    if (Object.prototype.hasOwnProperty.call(SMALL_UNIT_MAP, ch)) {
      if (number === 0n) number = 1n
      section += number * BigInt(SMALL_UNIT_MAP[ch])
      number = 0n
      continue
    }
    if (Object.prototype.hasOwnProperty.call(BIG_UNIT_MAP, ch)) {
      section += number
      number = 0n
      if (section === 0n) {
        // 一万亿这类连续大单位:把已有总数整体进一级
        if (total === 0n) return { value: 0n, error: `「${ch}」前缺少数字` }
        total *= BIG_UNIT_MAP[ch]
      } else {
        total += section * BIG_UNIT_MAP[ch]
        section = 0n
      }
      continue
    }
    return { value: 0n, error: `无法识别字符「${ch}」` }
  }

  total += section + number
  if (abbr) total += BigInt(abbr.digit) * abbreviationStep(abbr.unit)
  return { value: total, error: '' }
}

/** 中文数字 → 阿拉伯数字;支持负数、小数、大小写数字与 两/廿/卅。 */
export function chineseToNumber(input) {
  let s = String(input ?? '').trim()
  if (!s) return { value: '', error: '' }
  s = s
    .replace(/[\s,，_]/g, '')
    .replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))

  if (/^[+-]?\d+(?:\.\d+)?$/.test(s)) return { value: s.replace(/^\+/, ''), error: '' }

  let negative = false
  if (s[0] === '负' || s[0] === '負') {
    negative = true
    s = s.slice(1)
  } else if (s[0] === '正') {
    s = s.slice(1)
  }
  if (!s) return { value: '', error: '请输入中文数字,如 一百二十三' }

  const parts = s.split('点')
  if (parts.length > 2) return { value: '', error: '「点」只能出现一次' }
  const intText = parts[0] || '零'
  const decimalText = parts[1]

  const parsed = parseInteger(intText)
  if (parsed.error) return { value: '', error: parsed.error }

  let decimal = ''
  if (decimalText !== undefined) {
    if (!decimalText) return { value: '', error: '「点」后缺少小数位' }
    for (const ch of decimalText) {
      if (!Object.prototype.hasOwnProperty.call(DIGIT_MAP, ch)) {
        return { value: '', error: `小数部分包含无法识别的字符「${ch}」` }
      }
      decimal += DIGIT_MAP[ch]
    }
  }

  let value = parsed.value.toString() + (decimal ? '.' + decimal : '')
  if (negative) {
    if (parsed.value === 0n && /^0*$/.test(decimal)) value = '0'
    else value = '-' + value
  }
  return { value, error: '' }
}