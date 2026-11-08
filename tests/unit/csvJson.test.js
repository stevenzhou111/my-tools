// @vitest-environment node
// jsdom 环境缺 WebCrypto(crypto.subtle),密钥生成测试用 node 环境跑
import { describe, expect, it } from 'vitest'
import { parseCsv, csvToJson, jsonToCsv } from '../../src/utils/csvJson'
import { colorScheme, SCHEMES } from '../../src/utils/colorScheme'
import { generateKeyPair, toPem, KEY_KINDS } from '../../src/utils/keygen'

describe('csvJson · CSV 解析(RFC 4180)', () => {
  it('基础解析与 BOM/CR 兼容', () => {
    expect(parseCsv('a,b,c\r\n1,2,3')).toEqual([['a', 'b', 'c'], ['1', '2', '3']])
    expect(parseCsv('\uFEFFname,age')).toEqual([['name', 'age']])
  })

  it('引号包裹:字段内逗号、换行、双写引号转义', () => {
    const rows = parseCsv('name,note\n"张三","会说 ""你好"",也会换行\n第二行"')
    expect(rows[1]).toEqual(['张三', '会说 "你好",也会换行\n第二行'])
  })

  it('分号/制表符分隔符', () => {
    expect(parseCsv('a;b', ';')).toEqual([['a', 'b']])
    expect(parseCsv('a\tb', '\t')).toEqual([['a', 'b']])
  })

  it('空文本返回空数组', () => {
    expect(parseCsv('')).toEqual([])
    expect(parseCsv('   ')).toEqual([])
  })
})

describe('csvJson · CSV → JSON', () => {
  it('表头作键,类型推断(数字/布尔),前导零保持字符串', () => {
    const rows = csvToJson('id,name,ok,zip\n1,张三,true,007\n2.5,李四,false,00123')
    expect(rows).toEqual([
      { id: 1, name: '张三', ok: true, zip: '007' },
      { id: 2.5, name: '李四', ok: false, zip: '00123' },
    ])
  })

  it('关掉推断后全部为字符串;无表头模式输出二维数组', () => {
    expect(csvToJson('a,b\n1,2', { infer: false })).toEqual([{ a: '1', b: '2' }])
    expect(csvToJson('1,2\n3,4', { headerRow: false })).toEqual([[1, 2], [3, 4]])
  })

  it('重名表头自动加后缀;缺列补空串', () => {
    const rows = csvToJson('a,a\n1')
    expect(rows[0]).toEqual({ a: 1, a_2: '' })
  })
})

describe('csvJson · JSON → CSV 与往返', () => {
  it('对象数组:键取并集、特殊字段自动加引号', () => {
    const csv = jsonToCsv([{ name: 'a', note: '含,逗号' }, { name: 'b', extra: '含"引号"' }])
    expect(csv.split('\n')[0]).toBe('name,note,extra')
    expect(csv).toContain('"含,逗号"')
    expect(csv).toContain('"含""引号"""')
  })

  it('二维数组模式与 header 开关', () => {
    expect(jsonToCsv([['h1', 'h2'], [1, 2]], { header: false })).toBe('1,2\n')
    expect(jsonToCsv([['h1', 'h2'], [1, 2]])).toBe('h1,h2\n1,2\n')
  })

  it('CSV → JSON → CSV 往返(引用字段)值无损', () => {
    const src = 'name,note\n"a","b,c"\n"d","e""f"\n'
    const back = jsonToCsv(csvToJson(src, { infer: false }))
    // 引号只在需要时出现,值层面无损
    expect(parseCsv(back)).toEqual(parseCsv(src))
  })
})

describe('colorScheme · 配色方案', () => {
  it('纯红的互补/三角角色是标准纯色(HSL 仅转色相)', () => {
    const r = colorScheme('#ff0000')
    const get = (id) => r.schemes.find((s) => s.id === id).colors
    expect(get('complementary')).toEqual(['#ff0000', '#00ffff'])
    expect(get('triadic')).toEqual(['#ff0000', '#00ff00', '#0000ff'])
  })

  it('五类方案齐全,色相环绕 360° 不越界', () => {
    const r = colorScheme('#6366f1')
    expect(r.schemes.map((s) => s.id)).toEqual(SCHEMES.map((s) => s.id))
    for (const s of r.schemes) {
      for (const c of s.colors) expect(c).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  it('非法颜色抛可读错误', () => {
    expect(() => colorScheme('red')).toThrow('十六进制')
  })
})

describe('keygen · 非对称密钥(WebCrypto)', () => {
  it('KEY_KINDS 四种类型', () => {
    expect(KEY_KINDS.map((k) => k.id)).toEqual(['RSA-2048', 'RSA-4096', 'EC-P256', 'EC-P384'])
  })

  it('toPem 64 字符换行与标签', () => {
    const pem = toPem('A'.repeat(65), 'PUBLIC KEY')
    expect(pem.split('\n')[1]).toHaveLength(64)
    expect(pem).toContain('-----BEGIN PUBLIC KEY-----')
    expect(pem).toContain('-----END PUBLIC KEY-----')
  })

  it('RSA-2048:PEM 结构合法(SPKI/PKCS#8 头 + DER 序列标签 0x30)', async () => {
    const { publicPem, privatePem } = await generateKeyPair('RSA-2048')
    expect(publicPem.startsWith('-----BEGIN PUBLIC KEY-----')).toBe(true)
    expect(privatePem.startsWith('-----BEGIN PRIVATE KEY-----')).toBe(true)
    // DER 的 ASN.1 SEQUENCE 首字节是 0x30
    const b64 = publicPem.split('\n')[1]
    expect(Number.parseInt(b64, 36) && true).toBe(true) // base64 内容非空
    expect(Buffer.from(b64, 'base64')[0]).toBe(0x30)
  })

  it('EC-P256:可生成且公私钥不同', async () => {
    const { publicPem, privatePem } = await generateKeyPair('EC-P256')
    expect(publicPem).not.toBe(privatePem)
    expect(Buffer.from(publicPem.split('\n')[1], 'base64').length).toBeGreaterThan(40)
  })

  it('不支持的类型抛错', async () => {
    await expect(generateKeyPair('DSA-1024')).rejects.toThrow('不支持的密钥类型')
  })
})
