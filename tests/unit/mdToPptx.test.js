import { describe, expect, it } from 'vitest'
import { markdownToSlides, inlineToText } from '../../src/utils/mdToPptx'

const SAMPLE = `# 项目汇报

- 背景:三句讲完
- 目标:本月上线

## 数据

1. 转化率提升 12%
2. 客诉下降

\`\`\`
const ok = true
\`\`\`

更多细节见 **附录** 与 [文档](https://example.com)。

===

# 附录

- 附表一
`

describe('mdToPptx · 幻灯片拆分', () => {
  it('按 === 分页,首个标题作页标题,列表转圆点', () => {
    const slides = markdownToSlides(SAMPLE)
    expect(slides).toHaveLength(2)
    expect(slides[0].title).toBe('项目汇报')
    expect(slides[0].items[0]).toEqual({ text: '背景:三句讲完', bullet: true, mono: false })
    expect(slides[1].title).toBe('附录')
  })

  it('代码围栏整块转等宽文本(不剥内容)', () => {
    const slides = markdownToSlides(SAMPLE)
    const code = slides[0].items.find((i) => i.mono)
    expect(code.text).toContain('const ok = true')
  })

  it('数字列表保留序号文本并转圆点', () => {
    const slides = markdownToSlides(SAMPLE)
    expect(slides[0].items.some((i) => i.text === '转化率提升 12%' && i.bullet)).toBe(true)
  })

  it('行内标记剥离:粗体与链接只留文字;图片输出占位', () => {
    expect(inlineToText('**粗** 和 *斜* 与 `码`')).toBe('粗 和 斜 与 码')
    expect(inlineToText('[文档](https://example.com)')).toBe('文档')
    expect(inlineToText('![截图](a.png)')).toBe('截图(图片)')
  })

  it('空输入与无标题块', () => {
    expect(markdownToSlides('')).toEqual([])
    const s = markdownToSlides('没有标题只有内容')
    expect(s[0].title).toBe('没有标题只有内容')
  })
})

describe('mdToPptx · pptxgenjs 冒烟', () => {
  it('生成的 .pptx 是合法 ZIP(PK 头)且体积合理', async () => {
    const PptxGenJS = (await import('pptxgenjs')).default
    const slides = markdownToSlides(SAMPLE)
    const pptx = new PptxGenJS()
    pptx.defineLayout({ name: 'W16x9', width: 13.333, height: 7.5 })
    pptx.layout = 'W16x9'
    for (const sl of slides) {
      const s = pptx.addSlide()
      s.addText(sl.title, { x: 0.5, y: 0.4, w: 12.3, fontSize: 28, bold: true })
      if (sl.items.length) {
        s.addText(sl.items.map((i) => ({ text: i.text, options: { bullet: i.bullet } })), {
          x: 0.7, y: 1.6, w: 11.9, h: 5.2, fontSize: 16,
        })
      }
    }
    const buf = await pptx.write({ outputType: 'nodebuffer' })
    expect(buf[0]).toBe(0x50) // P
    expect(buf[1]).toBe(0x4b) // K
    expect(buf.length).toBeGreaterThan(20000)
  })
})
