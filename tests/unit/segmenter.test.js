import { describe, expect, it } from 'vitest'
import { segmentWords, segmentText, wordFrequency } from '../../src/utils/segmenter'
import { crc32, crc32Hex } from '../../src/utils/crc32'

describe('segmenter · 分词', () => {
  it('英文按空格词切分(词典无关,结果稳定)', () => {
    expect(segmentWords('The quick brown fox')).toEqual(['The', 'quick', 'brown', 'fox'])
  })

  it('中英混排保留原文形态', () => {
    const tokens = segmentWords('用 npm install 安装依赖')
    expect(tokens).toContain('npm')
    expect(tokens).toContain('install')
  })

  it('标点与空白不进结果', () => {
    expect(segmentWords('你好,世界! Hello, world.')).not.toContain(',')
    expect(segmentWords('你好,世界!')).toEqual(expect.arrayContaining(['你好', '世界']))
  })

  it('中文:逐字符全量覆盖,不丢字(鲁棒性质,不依赖词典版本)', () => {
    const text = '今天天气不错,适合出门散步'
    const tokens = segmentWords(text)
    const covered = [...text].filter((ch) => /\p{L}|\p{N}/u.test(ch)).length
    expect(tokens.reduce((n, t) => n + t.length, 0)).toBe(covered)
  })

  it('数字串整体成词', () => {
    expect(segmentWords('版本 2026 发布')).toContain('2026')
  })

  it('自定义分隔符', () => {
    expect(segmentText('hello world', { sep: '|' })).toBe('hello|world')
  })
})

describe('segmenter · 词频', () => {
  it('按次数降序,平局按 UTF-16 码点升序(环境无关)', () => {
    const freq = wordFrequency('b a b a c c')
    expect(freq).toEqual([
      { word: 'a', count: 2 },
      { word: 'b', count: 2 },
      { word: 'c', count: 2 },
    ])
  })

  it('minLen 过滤单字', () => {
    const freq = wordFrequency(['我', '喜欢', '工具箱', '我'], { minLen: 2 })
    expect(freq.map((f) => f.word)).toEqual(['喜欢', '工具箱'])
  })

  it('接受原文直接统计', () => {
    const freq = wordFrequency('red green red')
    expect(freq[0]).toEqual({ word: 'red', count: 2 })
  })
})

describe('crc32 · 校验值', () => {
  it('标准测试向量', () => {
    expect(crc32Hex('123456789')).toBe('CBF43926')
    expect(crc32Hex('')).toBe('00000000')
    expect(crc32Hex('a')).toBe('E8B7BE43')
  })

  it('接受字节序列(文件场景)', () => {
    const bytes = new TextEncoder().encode('123456789')
    expect(crc32(bytes)).toBe(0xcbf43926)
  })

  it('中文按 UTF-8 字节计算且结果稳定', () => {
    expect(crc32Hex('工具箱')).toBe(crc32Hex(new TextEncoder().encode('工具箱')))
    expect(crc32Hex('工具箱')).toMatch(/^[0-9A-F]{8}$/)
  })
})
