import { describe, expect, it } from 'vitest'
import { evalExpression } from '@/utils/calcExpression'

describe('evalExpression · 基本运算', () => {
  it('四则运算', () => {
    expect(evalExpression('1+2').value).toBe(3)
    expect(evalExpression('5*8-3').value).toBe(37)
    expect(evalExpression('100/4').value).toBe(25)
    expect(evalExpression('(1+2)*3').value).toBe(9)
    expect(evalExpression('  2 * (3 + 4) ').value).toBe(14)
  })

  it('乘方与常见符号写法', () => {
    expect(evalExpression('2^10').value).toBe(1024)
    expect(evalExpression('3×4').value).toBe(12)
    expect(evalExpression('10÷4').value).toBe(2.5)
  })

  it('消除浮点噪声', () => {
    expect(evalExpression('0.1+0.2').value).toBe(0.3)
  })

  it('负数与一元负号', () => {
    expect(evalExpression('-5+8').value).toBe(3)
    expect(evalExpression('2*-3').value).toBe(-6)
  })
})

describe('evalExpression · 非法与危险输入', () => {
  it('一切非白名单字符都被拒绝,不求值', () => {
    for (const bad of [
      'alert(1)',                       // 标识符 + 调用
      'process.exit',                   // 属性访问
      'constructor',                    // 标识符
      '1+2; alert(1)',                  // 语句
      'window',                         // 标识符
      '[1,2].length',                   // 数组语法
      '1+2=',                           // 尾随等号
      'abc',
      '1 + "a"',                        // 字符串
    ]) {
      expect(evalExpression(bad).value, `「${bad}」应被拒绝`).toBeNull()
    }
  })

  it('括号不配对、除零、空串返回 null', () => {
    expect(evalExpression('(1+2').value).toBeNull()
    expect(evalExpression('1+2)').value).toBeNull()
    expect(evalExpression('1/0').value).toBeNull() // Infinity
    expect(evalExpression('').value).toBeNull()
    expect(evalExpression('   ').value).toBeNull()
    expect(evalExpression('((()))').value).toBeNull() // 无操作数
  })

  it('百分比等未定义语义的符号不参与求值', () => {
    expect(evalExpression('50%').value).toBeNull()
  })
})