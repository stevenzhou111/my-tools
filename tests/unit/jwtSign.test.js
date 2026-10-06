import { describe, expect, it } from 'vitest'
import { b64urlDecode, b64urlEncode, createJwt, signPart, verifyJwt } from '@/utils/jwtSign'

// 基准由 node crypto.createHmac('sha256', secret).update(b64url(header)+'.'+b64url(payload)) 现算得出
const BASE_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IuW8oOS4iSIsImFkbWluIjp0cnVlfQ.LdyITPbKCtDonou-6zx3tVduEb3hLHG9fG84k2WduEA'
const SECRET = 'my-secret-key'

describe('jwtSign · 签名', () => {
  it('createJwt 与 node 基准完全一致', async () => {
    const { token } = await createJwt({ sub: '1234567890', name: '张三', admin: true }, SECRET)
    expect(token).toBe(BASE_TOKEN)
  })

  it('header 自动带 alg 与 typ,extraHeader 可扩展', async () => {
    const { header, token } = await createJwt({ a: 1 }, SECRET, 'HS256', { kid: 'key-1' })
    expect(header).toEqual({ alg: 'HS256', typ: 'JWT', kid: 'key-1' })
    const [h] = token.split('.')
    expect(JSON.parse(new TextDecoder().decode(b64urlDecode(h)))).toEqual(header)
  })

  it('signPart 对相同内容签名稳定,HS512 签名更长', async () => {
    const s1 = await signPart('a', 'b', SECRET)
    const s2 = await signPart('a', 'b', SECRET)
    expect(s1).toBe(s2)
    const s512 = await signPart('a', 'b', SECRET, 'HS512')
    expect(s512.length).toBeGreaterThan(s1.length)
  })

  it('不支持的算法抛错', async () => {
    await expect(signPart('a', 'b', SECRET, 'RS256')).rejects.toThrow('RS256')
  })
})

describe('jwtSign · 校验', () => {
  it('正确密钥通过,错误密钥拒绝并给出期望签名', async () => {
    const ok = await verifyJwt(BASE_TOKEN, SECRET)
    expect(ok.ok).toBe(true)
    const bad = await verifyJwt(BASE_TOKEN, 'wrong-secret')
    expect(bad.ok).toBe(false)
    expect(bad.expected).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('改一个字节即失败(防篡改)', async () => {
    const [h, p, s] = BASE_TOKEN.split('.')
    const tampered = [h, p, s.slice(0, -2) + (s.endsWith('aa') ? 'bb' : 'aa')].join('.')
    expect((await verifyJwt(tampered, SECRET)).ok).toBe(false)
  })

  it('结构错误与不支持算法报错', async () => {
    expect((await verifyJwt('a.b', SECRET)).error).toContain('三段')
    expect((await verifyJwt('x.y.z', SECRET)).error).toContain('header')
    const rs = await createJwt({ a: 1 }, 'k')
    const [rh, rp] = rs.token.split('.')
    // 构造合法的 RS256 头
    const forgedHeader = b64urlEncode(new TextEncoder().encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })))
    const forged = `${forgedHeader}.${rp}.${rh}`
    expect((await verifyJwt(forged, 'k')).error).toContain('RS256')
  })
})

describe('jwtSign · b64url', () => {
  it('含中文的 payload 编解码往返,且不含 + / 字符', () => {
    const bytes = new TextEncoder().encode('{"name":"张三"}')
    const encoded = b64urlEncode(bytes)
    expect(encoded).not.toContain('+')
    expect(encoded).not.toContain('/')
    expect(encoded).not.toContain('=')
    expect(new TextDecoder().decode(b64urlDecode(encoded))).toBe('{"name":"张三"}')
  })
})
