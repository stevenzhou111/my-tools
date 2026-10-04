import { describe, expect, it } from 'vitest'
import { base32Decode, randomSecret, secondsRemaining, toHex, totp } from '@/utils/totp'

describe('base32Decode', () => {
  it('RFC 4648 标准向量', () => {
    expect(toHex(base32Decode('ME======='))).toBe('61') // "a"
    expect(toHex(base32Decode('MY======='))).toBe('66') // "f"
    expect(toHex(base32Decode('MZXQ===='))).toBe('666f') // "fo"
    expect(toHex(base32Decode('MZXW6YQ='))).toBe('666f6f62') // "foob"
    expect(toHex(base32Decode('MZXW6YTBOI======'))).toBe('666f6f626172') // "foobar"
  })

  it('大小写、空格与连字符被忽略(粘贴-friendly)', () => {
    expect(toHex(base32Decode('mzxw6 ytboi======'))).toBe('666f6f626172')
    expect(toHex(base32Decode('MZXW6-YTBOI'))).toBe('666f6f626172')
  })

  it('非法字符给出明确报错', () => {
    expect(() => base32Decode('MZXW61')).toThrow(/非法/)
    expect(() => base32Decode('')).toThrow(/为空/)
  })
})

describe('totp · RFC 6238 官方向量', () => {
  // 密钥为 ASCII "12345678901234567890" 的 Base32 编码
  const SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'

  it('SHA-1 / 8 位 / 30s:全系列官方向量', async () => {
    // t → 期望码(RFC 6238 附录 B)
    const vectors = [
      [59, '94287082'],
      [1111111109, '07081804'],
      [1111111111, '14050471'],
      [1234567890, '89005924'],
      [2000000000, '69279037'],
      [20000000000, '65353130'],
    ]
    for (const [t, expected] of vectors) {
      expect(await totp(SECRET, { digits: 8, at: t })).toBe(expected)
    }
  })

  it('6 位输出是 8 位码的后 6 位(取模截断)', async () => {
    expect(await totp(SECRET, { digits: 6, at: 59 })).toBe('287082')
  })

  it('period 影响计数器', async () => {
    // 同一时刻,period=30 与 period=60 的计数器不同 → 码不同
    const a = await totp(SECRET, { digits: 8, at: 45 })
    const b = await totp(SECRET, { digits: 8, at: 45, period: 60 })
    expect(a).not.toBe(b)
  })
})

describe('randomSecret', () => {
  it('只含合法字符,默认 32 个(20 字节 = 160 位)', () => {
    const s = randomSecret()
    expect(s).toMatch(/^[A-Z2-7]{32}$/)
  })

  it('两次生成的密钥不同', () => {
    expect(randomSecret()).not.toBe(randomSecret())
  })

  it('随机密钥能被自己的解码器解开', () => {
    const s = randomSecret(20)
    expect(base32Decode(s).length).toBe(20)
  })
})

describe('secondsRemaining', () => {
  it('距下一次滚动剩余秒数', () => {
    expect(secondsRemaining(30, 59_000)).toBe(1)
    expect(secondsRemaining(30, 30_000)).toBe(30)
    expect(secondsRemaining(60, 119_000)).toBe(1)
  })
})