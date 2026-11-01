/**
 * 汇率换算:数据来自 frankfurter.app(欧洲央行参考汇率,工作日更新,免费无密钥)。
 *
 * 设计:
 * - 只请求一次 base=USD 的全量汇率,任意两种货币的比价由 USD 交叉计算,
 *   一次请求覆盖所有货币对,配合 localStorage 缓存(1 小时 TTL)把请求量压到最低;
 * - 网络失败时回退最近一次缓存,标记 stale,由界面如实标注"缓存于多久之前"。
 */

export const CURRENCIES = [
  { code: 'CNY', name: '人民币' },
  { code: 'USD', name: '美元' },
  { code: 'EUR', name: '欧元' },
  { code: 'JPY', name: '日元' },
  { code: 'GBP', name: '英镑' },
  { code: 'HKD', name: '港币' },
  { code: 'KRW', name: '韩元' },
  { code: 'SGD', name: '新加坡元' },
  { code: 'AUD', name: '澳元' },
  { code: 'CAD', name: '加元' },
  { code: 'CHF', name: '瑞士法郎' },
  { code: 'THB', name: '泰铢' },
  { code: 'MYR', name: '马来西亚林吉特' },
  { code: 'NZD', name: '新西兰元' },
  { code: 'INR', name: '印度卢比' },
  { code: 'TRY', name: '土耳其里拉' },
  { code: 'ZAR', name: '南非兰特' },
  { code: 'BRL', name: '巴西雷亚尔' },
  { code: 'MXN', name: '墨西哥比索' },
  { code: 'SEK', name: '瑞典克朗' },
  { code: 'NOK', name: '挪威克朗' },
  { code: 'DKK', name: '丹麦克朗' },
  { code: 'PLN', name: '波兰兹罗提' },
  { code: 'CZK', name: '捷克克朗' },
  { code: 'HUF', name: '匈牙利福林' },
  { code: 'ISK', name: '冰岛克朗' },
  { code: 'IDR', name: '印尼盾' },
  { code: 'PHP', name: '菲律宾比索' },
  { code: 'ILS', name: '以色列谢克尔' },
  { code: 'BGN', name: '保加利亚列弗' },
  { code: 'RON', name: '罗马尼亚列伊' },
]

export const CURRENCY_NAMES = Object.fromEntries(CURRENCIES.map((c) => [c.code, c.name]))

const CACHE_KEY = 'toolbox-currency-rates'
const TTL_MS = 60 * 60 * 1000 // 1 小时
const API = 'https://api.frankfurter.dev/v1/latest?base=USD'

/** 零小数展示的货币 */
const ZERO_DECIMAL = new Set(['JPY', 'KRW', 'IDR'])

export function formatMoney(v, code = '') {
  const digits = ZERO_DECIMAL.has(code) ? 0 : 2
  return Number(v).toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

/** 交叉汇率:rates 为 USD 基准(1 USD = rates[CODE]) */
export function convert(amount, rates, from, to) {
  if (!rates?.[from] || !rates?.[to]) return null
  const v = (Number(amount) * rates[to]) / rates[from]
  if (!Number.isFinite(v)) return null
  // 结果按目标货币的惯例精度取整
  return ZERO_DECIMAL.has(to) ? Math.round(v) : Math.round(v * 10000) / 10000
}

/** 1 from = ? to(展示用,6 位有效数字;不经过 convert 的展示舍入,保留完整比价精度) */
export function rateText(rates, from, to) {
  if (!rates?.[from] || !rates?.[to]) return ''
  const raw = rates[to] / rates[from]
  if (!Number.isFinite(raw)) return ''
  return (+raw.toPrecision(6)).toString()
}

function readCache() {
  try {
    const v = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
    if (v && v.rates && typeof v.fetchedAt === 'number') return v
  } catch { /* 缓存不可用忽略 */ }
  return null
}

function writeCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data))
  } catch { /* 存储不可用忽略 */ }
}

/**
 * 获取 USD 基准汇率(带缓存与离线兜底)。
 * @param {{force?:boolean, now?:number}} o now 供测试注入时间
 * @returns {Promise<{rates:object, date:string, fetchedAt:number, stale:boolean, fromCache:boolean, error:string}>}
 */
export async function getRates({ force = false, now = Date.now() } = {}) {
  const cached = readCache()
  if (!force && cached && now - cached.fetchedAt < TTL_MS) {
    return { ...cached, stale: false, fromCache: true, error: '' }
  }
  try {
    const res = await fetch(API)
    if (!res.ok) throw new Error(`汇率服务返回 ${res.status}`)
    const data = await res.json()
    if (!data?.rates || Object.keys(data.rates).length < 5) throw new Error('返回数据格式异常')
    // base 货币不在返回的 rates 里(如 base=USD 时无 USD 项),补上 1 保证交叉换算可用
    const rates = { ...data.rates, [data.base || 'USD']: 1 }
    const out = { rates, date: data.date, fetchedAt: now }
    writeCache(out)
    return { ...out, stale: false, fromCache: false, error: '' }
  } catch (e) {
    if (cached) {
      return { ...cached, stale: true, fromCache: true, error: `网络获取失败(${e.message}),已回退到缓存数据` }
    }
    return { rates: null, date: '', fetchedAt: 0, stale: false, fromCache: false, error: `获取汇率失败:${e.message}。请检查网络后重试;本工具需要联网。` }
  }
}

/** 清空缓存(测试用) */
export function clearRatesCache() {
  try {
    localStorage.removeItem(CACHE_KEY)
  } catch { /* 忽略 */ }
}
