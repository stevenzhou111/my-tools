import { describe, expect, it } from 'vitest'
import {
  convertEnvSource,
  normalizeFlatData,
  parseEnv,
  stringifyEnv,
} from '@/utils/envConvert'

describe('parseEnv', () => {
  it('解析注释、export、引号、转义与行内注释', () => {
    const text = [
      '# 数据库配置',
      'A=1',
      'B=hello world',
      'C="line1\\nline2"',
      "D='x y'",
      'E=foo # note',
      'F=',
      'export G=bar',
      'H=abc#def',
    ].join('\n')
    const { data, warnings } = parseEnv(text)
    expect(data).toEqual({
      A: '1',
      B: 'hello world',
      C: 'line1\nline2',
      D: 'x y',
      E: 'foo',
      F: '',
      G: 'bar',
      H: 'abc#def',
    })
    expect(warnings).toContain('注释不会保留到转换结果')
  })

  it('重复键后者覆盖,并给出告警', () => {
    const { data, warnings } = parseEnv('A=1\nA=2')
    expect(data).toEqual({ A: '2' })
    expect(warnings).toContain('键 A 重复,后者覆盖前者')
  })

  it('无效行与未闭合引号不中断解析', () => {
    const { data, warnings } = parseEnv('A=1\n不是键值\nB="unclosed')
    expect(data.B).toBe('unclosed')
    expect(warnings.some((w) => w.includes('不是有效的 KEY=VALUE'))).toBe(true)
    expect(warnings.some((w) => w.includes('引号未闭合'))).toBe(true)
  })
})

describe('normalizeFlatData', () => {
  it('标量、null 与数组转成字符串', () => {
    expect(normalizeFlatData({ A: '1', N: 2, B: true, Z: null, L: [1, 'x'] })).toEqual({
      data: { A: '1', N: '2', B: 'true', Z: '', L: '1,x' },
      error: '',
      warnings: [],
    })
  })

  it('嵌套对象与非法键明确报错', () => {
    expect(normalizeFlatData({ A: { B: 1 } }).error).toContain('嵌套对象')
    expect(normalizeFlatData({ A: [{ B: 1 }] }).error).toContain('数组包含对象')
    expect(normalizeFlatData({ 'A B': '1' }).error).toContain('合法的环境变量名')
    expect(normalizeFlatData([]).error).toContain('顶层必须是对象')
  })
})

describe('stringifyEnv', () => {
  it('按需加引号并支持 export 前缀', () => {
    const text = stringifyEnv(
      { A: '1', B: 'hello world', C: '', D: 'a#b', E: 'a"b\\c', F: 'line1\nline2' },
      { exportPrefix: true },
    )
    expect(text).toBe(
      [
        'export A=1',
        'export B="hello world"',
        'export C=""',
        'export D="a#b"',
        'export E="a\\"b\\\\c"',
        'export F="line1\\nline2"',
      ].join('\n') + '\n',
    )
  })

  it('空对象输出空串', () => {
    expect(stringifyEnv({})).toBe('')
  })
})

describe('convertEnvSource', () => {
  it('.env → JSON 保持字符串类型', () => {
    const r = convertEnvSource('A=1\nB=true', 'env', 'json')
    expect(r.error).toBe('')
    expect(JSON.parse(r.text)).toEqual({ A: '1', B: 'true' })
  })

  it('JSON → .env 支持数组与数字', () => {
    const r = convertEnvSource('{"A":"1","B":"hello world","C":[1,2],"D":3}', 'json', 'env')
    expect(r.error).toBe('')
    expect(r.text).toBe('A=1\nB="hello world"\nC=1,2\nD=3\n')
  })

  it('YAML → JSON 先扁平化再输出', () => {
    const r = convertEnvSource('A: 1\nB: hello\n', 'yaml', 'json')
    expect(r.error).toBe('')
    expect(JSON.parse(r.text)).toEqual({ A: '1', B: 'hello' })
  })

  it('嵌套结构被拒绝', () => {
    const r = convertEnvSource('{"A":{"B":1}}', 'json', 'env')
    expect(r.text).toBe('')
    expect(r.error).toContain('嵌套对象')
  })

  it('空输入、解析失败与未知格式', () => {
    expect(convertEnvSource('  ', 'env', 'json')).toEqual({ text: '', error: '', warnings: [] })
    expect(convertEnvSource('{bad', 'json', 'env').error).toBeTruthy()
    expect(convertEnvSource('A=1', 'ini', 'json').error).toBeTruthy()
  })

  it('注释告警会传递到结果中', () => {
    const r = convertEnvSource('# note\nA=1', 'env', 'json')
    expect(r.warnings).toContain('注释不会保留到转换结果')
  })
})