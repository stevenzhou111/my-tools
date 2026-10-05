import { describe, expect, it } from 'vitest'
import { buildToc, extractHeadings, githubSlug } from '@/utils/toc'

describe('toc · githubSlug', () => {
  it('英文小写、空格转连字符、剔标点', () => {
    expect(githubSlug('Hello, World!')).toBe('hello-world')
    // GitHub 不合并剔除标点后留下的连续连字符:& 删除后两侧空格各成一个 -
    expect(githubSlug('  Install & Setup  ')).toBe('install--setup')
  })

  it('汉字保留', () => {
    expect(githubSlug('你好,世界')).toBe('你好世界')
    expect(githubSlug('第 1 章 开始')).toBe('第-1-章-开始')
  })

  it('下划线与已有连字符保留', () => {
    expect(githubSlug('snake_case-name')).toBe('snake_case-name')
  })
})

describe('toc · extractHeadings', () => {
  it('提取层级与文本,行尾 # 剔除', () => {
    const md = ['# 大标题\n', '正文\n', '## 第一节 开场\n', '### 小节:背景 ###\n'].join('')
    expect(extractHeadings(md)).toEqual([
      { level: 1, text: '大标题', slug: '大标题' },
      { level: 2, text: '第一节 开场', slug: '第一节-开场' },
      { level: 3, text: '小节:背景', slug: '小节背景' },
    ])
  })

  it('跳过围栏代码块内的 # 注释', () => {
    const md = ['## real', '```bash', '# 这不是标题', '```', '## after'].join('\n')
    expect(extractHeadings(md).map((h) => h.text)).toEqual(['real', 'after'])
  })
})

describe('toc · buildToc', () => {
  const md = [
    '# 顶层',
    '## 安装',
    '### 依赖说明',
    '#### 子依赖',
    '## 使用',
  ].join('\n')

  it('默认 2-4 级,相对最浅层级缩进', () => {
    expect(buildToc(md)).toBe(
      ['- [安装](#安装)', '  - [依赖说明](#依赖说明)', '    - [子依赖](#子依赖)', '- [使用](#使用)'].join('\n'),
    )
  })

  it('层级范围与有序列表可选', () => {
    expect(buildToc(md, { minLevel: 2, maxLevel: 2 })).toBe('- [安装](#安装)\n- [使用](#使用)')
    expect(buildToc(md, { minLevel: 2, maxLevel: 3, ordered: true })).toBe(
      ['1. [安装](#安装)', '  2. [依赖说明](#依赖说明)', '3. [使用](#使用)'].join('\n'),
    )
  })

  it('没有匹配标题返回空串', () => {
    expect(buildToc('正文没有标题')).toBe('')
    expect(buildToc(md, { minLevel: 6, maxLevel: 6 })).toBe('')
  })
})
