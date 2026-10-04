import { describe, expect, it } from 'vitest'
import { formatPangu } from '@/utils/pangu'

describe('pangu · 中英文之间加空格', () => {
  it('汉字与英文之间加空格', () => {
    expect(formatPangu('Hello世界')).toBe('Hello 世界')
    expect(formatPangu('使用Vue开发')).toBe('使用 Vue 开发')
    expect(formatPangu('世界hello世界')).toBe('世界 hello 世界')
  })

  it('汉字与数字之间加空格(% 不参与加空格)', () => {
    expect(formatPangu('世界2026年')).toBe('世界 2026 年')
    expect(formatPangu('增长10%达到')).toBe('增长 10%达到')
  })

  it('纯英文 / 纯中文不受影响', () => {
    expect(formatPangu('hello world')).toBe('hello world')
    expect(formatPangu('你好世界')).toBe('你好世界')
    expect(formatPangu('已经是 加了空格 的')).toBe('已经是 加了空格 的')
  })

  it('连续混排双向都处理', () => {
    expect(formatPangu('混合English和中文mix成一句话')).toBe('混合 English 和中文 mix 成一句话')
  })

  it('空格开关可关闭', () => {
    expect(formatPangu('Hello世界', { spaceCjk: false })).toBe('Hello世界')
  })
})

describe('pangu · 全角转半角', () => {
  it('全角字母数字转半角(默认的中英加空格随后生效)', () => {
    expect(formatPangu('ＡＢＣ１２３', { fullwidthHalf: true })).toBe('ABC123')
    expect(formatPangu('版本ｖ２.０', { fullwidthHalf: true })).toBe('版本 v2.0')
  })

  it('默认不转换', () => {
    expect(formatPangu('ＡＢＣ')).toBe('ＡＢＣ')
  })

  it('全角空格转普通空格', () => {
    expect(formatPangu('你好\u3000世界', { fullwidthHalf: true })).toBe('你好 世界')
  })

  it('不会动汉字标点(。、「」)', () => {
    expect(formatPangu('你好。世界「测试」', { fullwidthHalf: true })).toBe('你好。世界「测试」')
  })
})

describe('pangu · 半角标点转全角', () => {
  it('汉字后的逗号句号转全角', () => {
    expect(formatPangu('你好,世界.', { halfPunctFull: true })).toBe('你好,世界。')
    expect(formatPangu('注意!', { halfPunctFull: true })).toBe('注意!')
    expect(formatPangu('问题?', { halfPunctFull: true })).toBe('问题?')
  })

  it('不误伤数字小数点与英文句子(默认加空格同时生效)', () => {
    expect(formatPangu('价格3.5元,共2份', { halfPunctFull: true })).toBe('价格 3.5 元,共 2 份')
    expect(formatPangu('Hello, world', { halfPunctFull: true })).toBe('Hello, world')
  })

  it('冒号分号也在处理范围', () => {
    expect(formatPangu('提示:如下;完毕', { halfPunctFull: true })).toBe('提示:如下;完毕')
  })
})

describe('pangu · 空白清理', () => {
  it('合并连续空格但保留换行', () => {
    expect(formatPangu('a  b\t\tc', { collapseSpaces: true })).toBe('a b c')
    expect(formatPangu('a  b', { collapseSpaces: false })).toBe('a  b')
  })

  it('去除行尾空白,保留行首缩进', () => {
    expect(formatPangu('x   \n  y\t\n', { trimTrailing: true })).toBe('x\n  y\n')
  })
})

describe('pangu · 组合', () => {
  it('全部开关一起开', () => {
    const out = formatPangu('Ｈello,world你好  世界2026!  ', {
      spaceCjk: true,
      fullwidthHalf: true,
      halfPunctFull: true,
      collapseSpaces: true,
      trimTrailing: true,
    })
    // 逗号前的 o 与叹号前的 6 都不是汉字,半角标点转全角不生效
    expect(out).toBe('Hello,world 你好 世界 2026!')
  })
})
