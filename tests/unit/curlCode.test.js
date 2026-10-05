import { describe, expect, it } from 'vitest'
import { parseCurl, tokenize, toFetchCode, toPythonCode } from '@/utils/curlCode'

describe('curlCode · tokenize', () => {
  it('单双引号、续行与空格', () => {
    expect(tokenize("curl -d '{\"a\": 1}' \\\n  https://a.b")).toEqual([
      'curl',
      '-d',
      '{"a": 1}',
      'https://a.b',
    ])
    expect(tokenize('curl "a b"  c')).toEqual(['curl', 'a b', 'c'])
    // 双引号内的 \" 转义;shell 单引号内不支持转义,不在此处理
    expect(tokenize('curl "say \\"hi\\""')).toEqual(['curl', 'say "hi"'])
  })
})

describe('curlCode · parseCurl', () => {
  it('最简 GET', () => {
    const p = parseCurl('curl https://api.example.com/users')
    expect(p.ok).toBe(true)
    expect(p.url).toBe('https://api.example.com/users')
    expect(p.method).toBe('GET')
    expect(p.body).toBe('')
  })

  it('POST + JSON 头 + JSON 体', () => {
    const p = parseCurl(`curl -X POST https://a.b/api -H 'Content-Type: application/json' -d '{"name":"张三"}'`)
    expect(p.method).toBe('POST')
    expect(p.headers).toEqual([{ name: 'Content-Type', value: 'application/json' }])
    expect(p.body).toBe('{"name":"张三"}')
  })

  it('JSON 体自动补 Content-Type', () => {
    const p = parseCurl(`curl -X POST https://a.b -d '{"a":1}'`)
    expect(p.headers).toEqual([{ name: 'Content-Type', value: 'application/json' }])
  })

  it('多个 -d 用 & 连接;-u 生成 Basic 认证头', () => {
    const p = parseCurl('curl -u admin:secret https://a.b -d a=1 -d b=2')
    expect(p.body).toBe('a=1&b=2')
    const auth = p.headers.find((h) => h.name === 'Authorization')
    expect(auth.value).toBe('Basic YWRtaW46c2VjcmV0')
  })

  it('表单字段与文件占位,方法默认 POST', () => {
    const p = parseCurl(`curl -F name=张三 -F file=@photo.png https://up.load`)
    expect(p.method).toBe('POST')
    expect(p.form).toEqual([
      { name: 'name', value: '张三', file: false },
      { name: 'file', value: '@photo.png', file: true },
    ])
  })

  it('--get 把 -d 拼进查询串', () => {
    const p = parseCurl('curl --get https://a.b/search -d q=你好 -d page=2')
    expect(p.url).toBe('https://a.b/search?q=你好&page=2')
    expect(p.body).toBe('')
    expect(p.method).toBe('GET')
  })

  it('未识别旗标列出而不丢弃', () => {
    const p = parseCurl('curl --retry 3 --compressed https://a.b')
    expect(p.ok).toBe(true)
    expect(p.unknown).toEqual(['--retry', '--compressed'])
  })

  it('错误情形', () => {
    expect(parseCurl('curl').ok).toBe(false)
    expect(parseCurl('curl -X https://a.b').ok).toBe(false)
    expect(parseCurl('curl -H NoColon https://a.b').ok).toBe(false)
    expect(parseCurl('curl -u nocolon https://a.b').ok).toBe(false)
    expect(parseCurl('curl -F nodata https://a.b').ok).toBe(false)
  })

  it('多行续行命令(JSON 体自动补 Content-Type)', () => {
    const p = parseCurl([
      "curl -X PUT 'https://a.b/1' \\",
      "  -H 'X-Token: abc' \\",
      "  -d '{\"v\":2}'",
    ].join('\n'))
    expect(p.method).toBe('PUT')
    expect(p.url).toBe('https://a.b/1')
    expect(p.headers).toEqual([
      { name: 'X-Token', value: 'abc' },
      { name: 'Content-Type', value: 'application/json' },
    ])
  })
})

describe('curlCode · 代码生成', () => {
  const p = parseCurl(`curl -X POST 'https://a.b/api' -H 'X-Token: abc' -d '{"name":"张三"}'`)

  it('fetch 代码包含方法、头与体', () => {
    const code = toFetchCode(p)
    expect(code).toContain("method: 'POST'")
    expect(code).toContain("'X-Token': 'abc'")
    expect(code).toContain(`'{"name":"张三"}'`)
    expect(code).toContain('https://a.b/api')
  })

  it('Python 代码使用 requests', () => {
    const code = toPythonCode(p)
    expect(code).toContain("requests.post('https://a.b/api'")
    expect(code).toContain("'X-Token': 'abc'")
    expect(code).toContain("data = '{\"name\":\"张三\"}'")
  })

  it('表单上传的 Python 代码带 open(...)', () => {
    const code = toPythonCode(parseCurl('curl -F file=@a.png https://up'))
    expect(code).toContain("open('a.png', 'rb')")
  })

  it('纯 GET 不输出 method 行', () => {
    const code = toFetchCode(parseCurl('curl https://a.b'))
    expect(code).not.toContain('method:')
  })
})
