import { describe, expect, it } from 'vitest'
import { evalSci } from '../../src/utils/sciExpression'

// 命令面板把用户输入直接交给 evalSci 执行,这里重点覆盖:
// 解析正确性、角度/弧度两种模式、非法输入一律 null(不得抛异常、不得执行任意内容)
const v = (s, opts) => evalSci(s, opts).value

describe('sciExpression · 四则与括号', () => {
  it('优先级与括号', () => {
    expect(v('1+2*3')).toBe(7)
    expect(v('(1+2)*3')).toBe(9)
    expect(v('7/2')).toBe(3.5)
    expect(v('2-3-4')).toBe(-5) // 左结合
    expect(v('1/0')).toBeNull() // 除零拒绝
  })

  it('一元正负号', () => {
    expect(v('-3+5')).toBe(2)
    expect(v('2*-3')).toBe(-6)
    expect(v('--3')).toBe(3)
    expect(v('+-1')).toBe(-1)
  })

  it('浮点精度经 toPrecision(12) 清洗', () => {
    expect(v('0.1+0.2')).toBe(0.3)
    expect(v('1/3*3')).toBe(1)
  })
})

describe('sciExpression · 幂运算', () => {
  it('右结合与负指数', () => {
    expect(v('2^10')).toBe(1024)
    expect(v('2^3^2')).toBe(512) // 右结合:2^(3^2)
    expect(v('2^-2')).toBe(0.25)
    expect(v('(-2)^2')).toBe(4)
  })

  it('溢出与 NaN 拒绝', () => {
    expect(v('9^9^9')).toBeNull() // Infinity
    expect(v('0^0')).toBe(1) // Math.pow 约定
  })
})

describe('sciExpression · 函数与常数', () => {
  it('常用函数', () => {
    expect(v('sqrt(16)')).toBe(4)
    expect(v('abs(-3.5)')).toBe(3.5)
    expect(v('ln(e)')).toBe(1)
    expect(v('log(100)')).toBe(2)
    expect(v('exp(0)')).toBe(1)
    expect(v('round(2.5)')).toBe(3)
    expect(v('floor(-1.5)')).toBe(-2)
    expect(v('ceil(1.01)')).toBe(2)
  })

  it('定义域之外返回 null', () => {
    expect(v('sqrt(-1)')).toBeNull()
    expect(v('ln(-1)')).toBeNull()
    expect(v('log(0)')).toBeNull() // -Infinity
    expect(v('asin(2)')).toBeNull()
  })

  it('弧度制(默认):三角以 pi 为参', () => {
    expect(v('sin(pi/2)')).toBe(1)
    expect(v('cos(pi)')).toBe(-1)
    expect(v('atan(inf)')).toBeNull() // 无此常数,识别为裸标识符
  })

  it('角度制(degrees):入参与反三角结果均为度', () => {
    expect(v('sin(30)', { degrees: true })).toBe(0.5)
    expect(v('tan(45)', { degrees: true })).toBe(1)
    expect(v('cos(180)', { degrees: true })).toBe(-1)
    expect(v('asin(0.5)', { degrees: true })).toBe(30)
    expect(v('atan(1)', { degrees: true })).toBe(45)
  })

  it('常数 pi / e,大小写不敏感', () => {
    // 输出经 toPrecision(12) 清洗,比 Math.PI 本身少几位有效数字
    expect(v('PI')).toBe(Number(Math.PI.toPrecision(12)))
    expect(v('2*pi')).toBeCloseTo(Math.PI * 2, 10)
    expect(v('E')).toBe(Number(Math.E.toPrecision(12)))
  })
})

describe('sciExpression · 非法输入一律 value:null', () => {
  it.each([
    '', '   ', null, undefined, 'abc', // 空/纯标识符
    '1+', '1++', '*3', '(1+2', '1+2)', // 结构不完整
    'foo(1)', 'sin', 'sin()', // 未知函数/裸函数名
    'constructor', 'toString(1)', '__proto__', // 原型链成员不得当作常数/函数
    'x=1', 'alert(1)', 'process', // 拟攻击输入:词法层面即被拆散为标识符而拒绝
    '1 & 2', '1;2', '中文', // 词法外字符
    '1..2', '1.2.3', // 畸形数字
    '1,2', '(1,2)', // 逗号不支持
    '2(3)', // 不支持隐式乘法
  ])('%p → null', (input) => {
    expect(evalSci(input).value).toBeNull()
  })

  it('解析失败不抛异常(面板依赖此约定)', () => {
    expect(() => evalSci('sin((((')).not.toThrow()
    expect(() => evalSci('^')).not.toThrow()
  })
})
