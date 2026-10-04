import { describe, expect, it } from 'vitest'
import { jsonToTs } from '@/utils/jsonToTs'

describe('jsonToTs · 基本生成', () => {
  it('嵌套对象生成多个 interface,根在前', () => {
    const { code, error } = jsonToTs('{"user":{"name":"a","age":1}}')
    expect(error).toBe('')
    const rootIdx = code.indexOf('export interface Root')
    const userIdx = code.indexOf('export interface RootUser')
    expect(rootIdx).toBeGreaterThanOrEqual(0)
    expect(userIdx).toBeGreaterThan(rootIdx)
    expect(code).toContain('user: RootUser;')
  })

  it('根是数组时输出 type 别名 + 元素 interface', () => {
    const { code } = jsonToTs('[{"id":1}]')
    expect(code).toContain('export type Root = RootItem[];')
    expect(code).toContain('export interface RootItem {\n  id: number;\n}')
  })

  it('根是标量输出 type 别名', () => {
    expect(jsonToTs('42').code).toBe('export type Root = number;')
    expect(jsonToTs('"hi"').code).toBe('export type Root = string;')
    expect(jsonToTs('null').code).toBe('export type Root = null;')
  })

  it('数组元素同形 → 单一类型;异形 → 联合类型', () => {
    expect(jsonToTs('[1,2,3]').code).toContain('export type Root = number[];')
    const mixed = jsonToTs('[{"a":1}, 5]')
    expect(mixed.code).toContain('export type Root = (RootItem | number)[];')
  })

  it('空数组 → unknown[]', () => {
    expect(jsonToTs('[]').code).toContain('export type Root = unknown[];')
    expect(jsonToTs('{"x":[]}').code).toContain('x: unknown[];')
  })
})

describe('jsonToTs · 结构签名去重', () => {
  it('两个分支里形状相同的对象只生成一个 interface', () => {
    const { code } = jsonToTs('{"a":{"id":1,"name":"x"},"b":{"id":2,"name":"y"}}')
    const matches = code.match(/export interface/g) ?? []
    expect(matches.length).toBe(2) // Root + 复用的同一个子接口
    expect(code).toContain('a: RootA;')
    expect(code).toContain('b: RootA;')
    expect(code).not.toContain('RootB') // b 没有单独生成接口
  })

  it('数组元素是对象时,数组内多个同形元素合并为一个 interface', () => {
    const { code } = jsonToTs('{"items":[{"id":1},{"id":2}]}')
    const matches = code.match(/export interface/g) ?? []
    expect(matches.length).toBe(2) // Root + RootItems
  })
})

describe('jsonToTs · 属性名与命名', () => {
  it('非法标识符加引号', () => {
    const { code } = jsonToTs('{"a-b":1,"2x":true,"ok":3}')
    expect(code).toContain(`'a-b': number;`)
    expect(code).toContain(`'2x': boolean;`)
    expect(code).toContain('ok: number;')
  })

  it('自定义根名', () => {
    const { code } = jsonToTs('{"x":1}', 'AppConfig')
    expect(code).toContain('export interface AppConfig')
  })

  it('分隔符 key 生成可读的接口名', () => {
    const { code } = jsonToTs('{"user_profile":{"user_name":"a"}}')
    expect(code).toContain('export interface RootUserProfile')
  })
})

describe('jsonToTs · 错误处理', () => {
  it('非法 JSON 返回 error', () => {
    expect(jsonToTs('{bad}').error).toBeTruthy()
    expect(jsonToTs('{bad}').code).toBe('')
  })

  it('空输入返回空代码', () => {
    expect(jsonToTs('')).toEqual({ code: '', error: '' })
  })
})