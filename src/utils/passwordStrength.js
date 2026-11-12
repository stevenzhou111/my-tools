/**
 * 密码强度检测:@zxcvbn-ts(浏览器本地词典推理,零网络)。
 * crackTimes 按两种口径换算成中文时长:
 * - fast:站点泄露库被直接撞库(GPU 秒级百万次)
 * - slow:站点用了 bcrypt 类慢哈希时的离线破解
 * feedback 的 suggestion/warning 是英文 key,这里自带 zh-CN 映射。
 */
import { ZxcvbnFactory } from '@zxcvbn-ts/core'
import * as common from '@zxcvbn-ts/language-common'

let analyzer = null
function getAnalyzer() {
  if (!analyzer) {
    analyzer = new ZxcvbnFactory({
      dictionary: common.dictionary,
      graphs: common.adjacencyGraphs,
      useLevenshteinDistance2: true,
    })
  }
  return analyzer
}

const SCORE_LABELS = ['非常弱', '弱', '一般', '强', '非常强']

const SUGGESTION_ZH = {
  useWords: '改用多个不相关单词组成的口令短语',
  noNeed: '已经足够强,不必再加复杂符号',
  anotherWord: '再加几个不相关的单词或符号',
  repeated: '有连续重复的字符,去掉或替换它们',
  sequences: '包含 abc / 123 这类顺序序列,打乱它们',
  dates: '包含日期,容易被枚举,避免使用',
  capitalization: '大小写只变化了首字母,再多几处变化',
  allUppercase: '全大写,混入小写会更难猜',
  allLowercase: '全小写,混入大写会更难猜',
  l33t: '可预测的字符替换(@ 换 a 之类)帮不上忙,换更长的随机组合',
  reversed: '反转单词也躲不过字典攻击',
}

const WARNING_ZH = {
  topTen: '这是最常被使用的 10 个密码之一',
  topHundred: '这是最常被使用的 100 个密码之一',
  common: '这是常见密码字典里的词',
  similarToCommon: '和某个常见密码太相似',
  simpleRepeat: '同一字符连续重复',
  extendedRepeat: '同一段字符反复出现',
  dates: '包含日期,容易被枚举',
  namesByThemselves: '单独的人名容易被猜到',
  commonNames: '包含常见人名',
  wordByItself: '单个常见词容易被猜到',
  recentYear: '包含近年年份,容易被枚举',
  keyPattern: '键盘走位模式(如 qwerty)很好猜',
  straightRow: '横向连续按键,很好猜',
  reversedWords: '反转单词同样在字典里',
}

/** 秒 → 中文时长;超长时收敛为年/世纪口径 */
function humanTime(seconds) {
  const s = Math.max(0, Math.round(seconds))
  if (s < 1) return '瞬间'
  if (s < 60) return `${s} 秒`
  const m = Math.floor(s / 60)
  if (s < 3600) return `${m} 分 ${s % 60} 秒`
  const h = Math.floor(s / 3600)
  if (s < 86400) return `${h} 小时`
  const d = Math.floor(s / 86400)
  if (d < 365) return `${d} 天`
  const y = Math.floor(d / 365)
  if (y < 10000) return `${y.toLocaleString('zh-CN')} 年`
  return '上万年起步(实际等于不可破解)'
}

/**
 * 分析密码强度。
 * @param {string} password
 * @param {string[]} userInputs 用户上下文词(用户名/站点名等),出现在密码里会直接降分
 * @returns {{score:number,label:string,fastText:string,slowText:string,suggestions:string[],warning:string}|null}
 */
export function analyzePassword(password, userInputs = []) {
  const pw = String(password ?? '')
  if (!pw) return null
  const inputs = (Array.isArray(userInputs) ? userInputs : []).map((s) => String(s).trim()).filter(Boolean)
  const r = getAnalyzer().check(pw, inputs)
  return {
    score: r.score,
    label: SCORE_LABELS[r.score],
    fastText: humanTime(r.crackTimes.offlineFastHashingXPerSecond.seconds),
    slowText: humanTime(r.crackTimes.offlineSlowHashingXPerSecond.seconds),
    suggestions: (r.feedback.suggestions || []).map((k) => SUGGESTION_ZH[k] || k),
    warning: r.feedback.warning ? (WARNING_ZH[r.feedback.warning] || r.feedback.warning) : '',
  }
}
