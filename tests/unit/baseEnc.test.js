import { describe, expect, it } from 'vitest'
import { base32Decode, base32Encode, base58Decode, base58Encode, base62Decode, base62Encode } from '@/utils/baseEnc'

describe('baseEnc · Base32(RFC 4648 官方向量)', () => {
  const VECTORS = [
    ['', ''],
    ['f', 'MY======'],
    ['fo', 'MZXQ===='],
    ['foo', 'MZXW6==='],
    ['foob', 'MZXW6YQ='],
    ['fooba', 'MZXW6YTB'],
    ['foobar', 'MZXW6YTBOI======'],
  ]
  it.each(VECTORS)('%j → %j', (plain, encoded) => {
    expect(base32Encode(plain)).toBe(encoded)
    expect(base32Decode(encoded)).toBe(plain)
  })

  it('容忍小写、空格与填充缺失', () => {
    expect(base32Decode('mzxw6===')).toBe('foo')
    expect(base32Decode('MZXW6')).toBe('foo')
  })

  it('非法字符报错', () => {
    expect(() => base32Decode('MZXW61')).toThrow('Base32')
  })
})

describe('baseEnc · Base58(Bitcoin 字母表)', () => {
  it('已知向量 hello world → StV1DL6CwTryKyV', () => {
    expect(base58Encode('hello world')).toBe('StV1DL6CwTryKyV')
    expect(base58Decode('StV1DL6CwTryKyV')).toBe('hello world')
  })

  it('node 现算基准与往返', () => {
    expect(base58Encode('hello')).toBe('Cn8eVZg')
    expect(base58Encode('你好')).toBe('2xuZUfBKa')
    for (const s of ['hello', '你好', '0', '  ', 'Trailing 0OIl 不在字母表'.slice(0, 6)]) {
      expect(base58Decode(base58Encode(s))).toBe(s)
    }
  })

  it('前导零字节编码为首字符 1', () => {
    // \u0000\u0000hello → 11 + 剩余编码
    const encoded = base58Encode('\u0000\u0000hello')
    expect(encoded.startsWith('11')).toBe(true)
    expect(base58Decode(encoded)).toBe('\u0000\u0000hello')
  })

  it('字母表外字符报错(0OIl 不在 Bitcoin 字母表)', () => {
    expect(() => base58Decode('O0Il')).toThrow('字母表外')
  })
})

describe('baseEnc · Base62', () => {
  it('node 现算基准与往返', () => {
    expect(base62Encode('hello world')).toBe('AAwf93rvy4aWQVw')
    expect(base62Encode('hello')).toBe('7tQLFHz')
    expect(base62Encode('你好')).toBe('19PqtKE1t')
    for (const s of ['hello world', '你好', 'a', '42', '   ']) {
      expect(base62Decode(base62Encode(s))).toBe(s)
    }
  })

  it('非法字符报错', () => {
    expect(() => base62Decode('hello-world')).toThrow('字母表外')
  })
})
