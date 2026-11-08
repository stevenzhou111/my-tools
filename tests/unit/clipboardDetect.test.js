import { describe, expect, it } from 'vitest'
import { detectContentType } from '../../src/utils/clipboardDetect'

const d = (t) => detectContentType(t)?.toolId ?? null

describe('clipboardDetect · detectContentType', () => {
  it('JSON(对象/数组/带空白)', () => {
    expect(d('{"a":1}')).toBe('json')
    expect(d('[1,2,3]')).toBe('json')
    expect(d('  \n{"a": [1, 2]}  ')).toBe('json')
    expect(d('{broken')).toBeNull()
  })

  it('JWT 三段式', () => {
    expect(d('eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.SflKxwRJSMeK')).toBe('jwt')
    // 只有 header.payload(无签名段)不按 JWT 识别
    expect(d('eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0')).toBeNull()
  })

  it('URL', () => {
    expect(d('https://example.com/a?b=1')).toBe('url-parser')
    expect(d('http://localhost:5173')).toBe('url-parser')
    expect(d('ftp://example.com')).toBeNull()
    expect(d('https://带空格 example.com')).toBeNull()
  })

  it('颜色值(3/4/6/8 位 hex)', () => {
    expect(d('#fff')).toBe('color')
    expect(d('#FFFFFF')).toBe('color')
    expect(d('#ffffffff')).toBe('color')
    expect(d('#12g')).toBeNull()
    expect(d('#12345')).toBeNull()
  })

  it('Base64:字母数字 + 填充/运算符,长度 4 的倍数', () => {
    expect(d('YWJjZGVmZ2hp')).toBeNull() // 无 +/= 特征
    expect(d('YWJjZGVmZ2hjPQ==')).toBe('base64')
    expect(d('aGVsbG8gd29ybGQ+')).toBe('base64') // 含 + 且长度合法(16 字符)
    expect(d('abcdef123456')).toBeNull()
  })

  it('时间戳(13 位毫秒 / 10 位秒)', () => {
    // 裸数字虽是合法 JSON 标量,但应识别为时间戳而非推荐 JSON 工具(回归:旧实现被 JSON 分支吞掉)
    expect(d('1700000000000')).toBe('timestamp')
    expect(d('1700000000')).toBe('timestamp')
    expect(d('170000000000')).toBeNull() // 12 位不匹配
  })

  it('图片 Data URL → 推荐二维码解析', () => {
    expect(d('data:image/png;base64,iVBORw0KGgo=')).toBe('qr-decode')
    expect(d('data:image/jpeg;base64,/9j/4AAQ')).toBe('qr-decode')
    expect(d('data:application/pdf;base64,JVBERi0=')).toBeNull()
  })

  it('IPv4 → 子网计算', () => {
    expect(d('192.168.1.1')).toBe('subnet-calc')
    expect(d('256.300.1.1')).toBe('subnet-calc') // 宽松匹配,交给工具内校验
  })

  it('空/超长/普通文本 → null', () => {
    expect(d('')).toBeNull()
    expect(d('   \n  ')).toBeNull()
    expect(d('x'.repeat(100001))).toBeNull()
    expect(d('hello world')).toBeNull()
    expect(d(null ?? '')).toBeNull()
  })

  it('带换行的多行文本不整段误判(需整体匹配)', () => {
    expect(d('line1\nline2')).toBeNull()
  })
})
