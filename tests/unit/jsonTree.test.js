import { describe, expect, it } from 'vitest'
import { buildJsonTree, nodePath, previewValue, typeName } from '@/utils/jsonTree'

describe('buildJsonTree · 解析与结构', () => {
  it('嵌套对象与数组的 size/depth 统计', () => {
    const { root, error, stats } = buildJsonTree('{"a":1,"b":[true,null],"c":{"d":"x"}}')
    expect(error).toBe('')
    expect(root.type).toBe('object')
    expect(root.size).toBe(7) // 根 + a + b + true + null + c + d
    expect(root.depth).toBe(3)
    expect(stats).toEqual({ nodes: 7, depth: 3, keys: 2, arrays: 1 })
  })

  it('叶子类型标注正确', () => {
    const { root } = buildJsonTree('{"s":"x","n":1.5,"b":false,"z":null}')
    const types = Object.fromEntries(root.children.map((c) => [c.key, c.type]))
    expect(types).toEqual({ s: 'string', n: 'number', b: 'boolean', z: 'null' })
  })

  it('数组元素用下标作 key', () => {
    const { root } = buildJsonTree('[10,20]')
    expect(root.type).toBe('array')
    expect(root.children.map((c) => c.key)).toEqual(['0', '1'])
    expect(root.value).toBe('[2]')
  })

  it('顶层就是标量也可以', () => {
    expect(buildJsonTree('42').root.type).toBe('number')
    expect(buildJsonTree('"hi"').root.type).toBe('string')
    expect(buildJsonTree('null').root.type).toBe('null')
  })

  it('空容器统计为 1 个节点', () => {
    const { stats } = buildJsonTree('{"a":{},"b":[]}')
    expect(stats.nodes).toBe(3)
    expect(stats.keys).toBe(2) // 根对象 + a
    expect(stats.arrays).toBe(1)
  })

  it('空输入返回空结果而不是报错', () => {
    expect(buildJsonTree('')).toEqual({ root: null, error: '', stats: null })
    expect(buildJsonTree('   ')).toEqual({ root: null, error: '', stats: null })
  })

  it('非法 JSON 返回可读错误', () => {
    const { root, error } = buildJsonTree('{bad}')
    expect(root).toBeNull()
    expect(error).toBeTruthy()
  })
})

describe('nodePath', () => {
  it('根是 $,合法标识符用点号,特殊字符用括号', () => {
    expect(nodePath(null, null)).toBe('$')
    expect(nodePath('user', '$')).toBe('$.user')
    expect(nodePath('0', '$')).toBe('$[0]') // 纯数字 key 不能用点号
    expect(nodePath('a-b', '$')).toBe('$["a-b"]')
    expect(nodePath('name', '$.user')).toBe('$.user.name')
  })
})

describe('previewValue', () => {
  it('字符串带引号,超长截断', () => {
    expect(previewValue({ type: 'string', value: 'hi' })).toBe('"hi"')
    const long = previewValue({ type: 'string', value: 'x'.repeat(100) })
    expect(long.length).toBeLessThanOrEqual(62)
    expect(long.endsWith('…"')).toBe(true)
  })

  it('其他类型直接字符串化', () => {
    expect(previewValue({ type: 'number', value: 1.5 })).toBe('1.5')
    expect(previewValue({ type: 'boolean', value: false })).toBe('false')
    expect(previewValue({ type: 'object', value: '{3}' })).toBe('{3}')
  })
})

describe('typeName', () => {
  it('输出中文名', () => {
    expect(typeName('string')).toBe('字符串')
    expect(typeName('array')).toBe('数组')
    expect(typeName('null')).toBe('null')
  })
})