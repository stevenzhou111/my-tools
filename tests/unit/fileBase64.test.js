import { describe, expect, it } from 'vitest'
import {
  buildDataUrl,
  decodeBase64,
  extensionForMime,
  fileNameForMime,
  guessMime,
  splitDataUrl,
} from '@/utils/fileBase64'

describe('fileBase64', () => {
  it('按扩展名推断 MIME,未知回落 octet-stream', () => {
    expect(guessMime('a.PNG')).toBe('image/png')
    expect(guessMime('doc.md')).toBe('text/markdown')
    expect(guessMime('no-ext')).toBe('application/octet-stream')
  })

  it('MIME 反推扩展名与文件名', () => {
    expect(extensionForMime('application/json;charset=utf-8')).toBe('json')
    expect(extensionForMime('image/svg+xml')).toBe('svg')
    expect(extensionForMime('application/x-unknown')).toBe('x-unknown')
    expect(fileNameForMime('image/jpeg')).toBe('decoded.jpg')
    expect(fileNameForMime('text/plain', 'note')).toBe('note.txt')
  })

  it('解析 Data URL(含 charset)与纯 base64', () => {
    expect(splitDataUrl('data:text/plain;charset=utf-8;base64,aGk=')).toEqual({
      mime: 'text/plain',
      base64: 'aGk=',
      error: '',
    })
    expect(splitDataUrl('aGk=')).toEqual({ mime: '', base64: 'aGk=', error: '' })
    expect(buildDataUrl('text/plain', 'aGk=')).toBe('data:text/plain;base64,aGk=')
  })

  it('拒绝非 base64 或缺少逗号的 Data URL', () => {
    expect(splitDataUrl('data:text/plain,hi').error).toContain('仅支持 base64')
    expect(splitDataUrl('data:text/plain;base64').error).toContain('逗号')
    expect(splitDataUrl('').error).toContain('为空')
  })

  it('解码标准 / URL-safe / 带空白 / 缺填充的 base64', () => {
    const hi = [104, 105]
    expect([...decodeBase64('aGk=').bytes]).toEqual(hi)
    expect([...decodeBase64('aGk').bytes]).toEqual(hi)
    expect([...decodeBase64(' aG\nk ').bytes]).toEqual(hi)
    expect([...decodeBase64('-w').bytes]).toEqual([251])
  })

  it('非法 base64 给出错误', () => {
    expect(decodeBase64('').error).toContain('为空')
    expect(decodeBase64('abcde').error).toContain('长度')
    expect(decodeBase64('ab$c').error).toContain('非法字符')
  })
})