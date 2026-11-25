import { describe, expect, it } from 'vitest'
import { ZH_MODES, convertZh } from '@/utils/zhConvert'

describe('zhConvert', () => {
  it('简体转台湾繁体', () => {
    expect(convertZh('汉语 计算机', 's2t')).toEqual({ text: '漢語 計算機', error: '' })
  })

  it('台湾用语模式做词语级替换', () => {
    expect(convertZh('这个软件和网络', 's2twp').text).toBe('這個軟體和網路')
  })

  it('简体转香港繁体', () => {
    expect(convertZh('这个软件和网络', 's2hk').text).toBe('這個軟件和網絡')
  })

  it('台繁与港繁都能转回简体', () => {
    expect(convertZh('這個軟體和網路', 't2s').text).toBe('这个软件和网络')
    expect(convertZh('這個軟件和網絡', 'hk2s').text).toBe('这个软件和网络')
  })

  it('保留标点、换行与英文数字', () => {
    const { text } = convertZh('OpenCC 1.4.2\n汉语,测试!', 's2t')
    expect(text).toBe('OpenCC 1.4.2\n漢語,測試!')
  })

  it('空输入与未知方向', () => {
    expect(convertZh('  ', 's2t')).toEqual({ text: '', error: '' })
    expect(convertZh('汉语', 'nope').error).toContain('未知')
  })

  it('方向表覆盖简繁双向', () => {
    expect(ZH_MODES.map((m) => m.id)).toEqual(['s2t', 's2twp', 's2hk', 't2s', 'hk2s'])
  })
})