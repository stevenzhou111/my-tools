import { describe, expect, it } from 'vitest'
import { calcSubnet } from '@/utils/subnet'

const ok = (s) => calcSubnet(s)
const err = (s) => calcSubnet(s).error

describe('calcSubnet · CIDR 输入', () => {
  it('标准 /24', () => {
    const r = ok('192.168.1.100/24')
    expect(r.error).toBe('')
    expect(r.network).toBe('192.168.1.0')
    expect(r.broadcast).toBe('192.168.1.255')
    expect(r.mask).toBe('255.255.255.0')
    expect(r.wildcard).toBe('0.0.0.255')
    expect(r.firstHost).toBe('192.168.1.1')
    expect(r.lastHost).toBe('192.168.1.254')
    expect(r.total).toBe(256)
    expect(r.usable).toBe(254)
    expect(r.isPrivate).toBe(true)
  })

  it('非对齐的主机地址自动落到所属网络', () => {
    // 10.1.2.3/8 的网络是 10.0.0.0,而不是 10.1.2.0
    const r = ok('10.1.2.3/8')
    expect(r.network).toBe('10.0.0.0')
    expect(r.broadcast).toBe('10.255.255.255')
    expect(r.usable).toBe(2 ** 24 - 2)
  })

  it('/30 只有两个可用主机', () => {
    const r = ok('192.168.1.5/30')
    expect(r.network).toBe('192.168.1.4')
    expect(r.firstHost).toBe('192.168.1.5')
    expect(r.lastHost).toBe('192.168.1.6')
    expect(r.broadcast).toBe('192.168.1.7')
    expect(r.usable).toBe(2)
  })

  it('/31 与 /32 无传统可用主机(RFC 3021)', () => {
    expect(ok('10.0.0.4/31').usable).toBe(0)
    expect(ok('10.0.0.4/32').usable).toBe(0)
    expect(ok('10.0.0.4/32').network).toBe('10.0.0.4')
  })

  it('/0 覆盖全部 IPv4', () => {
    const r = ok('1.2.3.4/0')
    expect(r.network).toBe('0.0.0.0')
    expect(r.broadcast).toBe('255.255.255.255')
    expect(r.total).toBe(2 ** 32)
  })

  it('公网地址 isPrivate 为 false', () => {
    expect(ok('8.8.8.8/32').isPrivate).toBe(false)
    expect(ok('172.32.0.1/16').isPrivate).toBe(false) // 172.16~31 才是私网
    expect(ok('172.20.0.1/16').isPrivate).toBe(true)
    expect(ok('100.64.0.1/10').isPrivate).toBe(true) // CGNAT
  })
})

describe('calcSubnet · 掩码输入', () => {
  it('点分掩码等价于 CIDR', () => {
    const r = ok('192.168.1.100 255.255.0.0')
    expect(r.error).toBe('')
    expect(r.prefix).toBe(16)
    expect(r.network).toBe('192.168.0.0')
    expect(r.mask).toBe('255.255.0.0')
  })

  it('非连续掩码被拒绝', () => {
    expect(err('192.168.1.0 255.255.0.255')).toBeTruthy()
    expect(err('192.168.1.0 255.0.255.0')).toBeTruthy()
  })
})

describe('calcSubnet · 非法输入', () => {
  it('各类坏输入返回 error 而不抛异常', () => {
    for (const bad of ['abc', '1.2.3', '1.2.3.256/24', '1.2.3.4/33', '1.2.3.4', '1.02.3.4/24', '', '1.2.3.4/abc']) {
      const r = calcSubnet(bad)
      if (bad === '') {
        expect(r.error).toBe('') // 空输入 = 用户还没打字,不算错
      } else {
        expect(r.error, `输入「${bad}」应报错`).toBeTruthy()
      }
    }
  })
})