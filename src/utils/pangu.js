/**
 * 中文排版格式化(「盘古之白」):在中英文 / 数字之间加空格、
 * 全半角标点归一、合并连续空格与行尾空白。纯函数,逐条开关可组合。
 */

const HAN = '\\p{Script=Han}'

/**
 * @param {string} text
 * @param {object} opts
 * @param {boolean} opts.spaceCjk      中文与英文/数字之间加空格
 * @param {boolean} opts.fullwidthHalf 全角字母数字转半角(ＡＢＣ１２３ → ABC123)
 * @param {boolean} opts.halfPunctFull 中文后的 , . : ; ! ? 转为全角
 * @param {boolean} opts.collapseSpaces 连续空格 / 制表符合并为一个空格
 * @param {boolean} opts.trimTrailing  去除每行行尾空白
 */
export function formatPangu(
  text,
  { spaceCjk = true, fullwidthHalf = false, halfPunctFull = false, collapseSpaces = false, trimTrailing = false } = {},
) {
  let s = text
  if (fullwidthHalf) {
    // 全角字母数字(FF10-FF19 / FF21-FF3A / FF41-FF5A)平移到 ASCII
    s = s.replace(/[\uFF10-\uFF19\uFF21-\uFF3A\uFF41-\uFF5A]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0xfee0),
    )
    // 全角空格 → 普通空格
    s = s.replace(/\u3000/g, ' ')
  }
  if (halfPunctFull) {
    // 仅处理紧跟在汉字后的半角标点,避免误伤数字小数点(3.5)与英文句子
    s = s.replace(new RegExp(`(${HAN})([,.;:!?])(?=[\\s${HAN}]|$)`, 'gu'), (m, han, p) => {
      return han + { ',': ',', '.': '。', ';': ';', ':': ':', '!': '!', '?': '?' }[p]
    })
  }
  if (spaceCjk) {
    s = s.replace(new RegExp(`(${HAN})([A-Za-z0-9])`, 'gu'), '$1 $2')
    s = s.replace(new RegExp(`([A-Za-z0-9])(${HAN})`, 'gu'), '$1 $2')
  }
  if (collapseSpaces) s = s.replace(/[ \t]{2,}/g, ' ')
  if (trimTrailing) s = s.replace(/[ \t]+$/gm, '')
  return s
}
