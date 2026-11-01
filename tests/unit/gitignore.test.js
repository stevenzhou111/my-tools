import { describe, expect, it } from 'vitest'
import { GITIGNORE_GROUPS, mergeGitignore } from '@/utils/gitignore'

describe('gitignore · 模板数据', () => {
  it('组 id 唯一且每组都有规则', () => {
    const ids = GITIGNORE_GROUPS.map((g) => g.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const g of GITIGNORE_GROUPS) {
      expect(g.lines.length, `组 ${g.id} 没有规则`).toBeGreaterThan(0)
      expect(g.label.trim()).not.toBe('')
    }
  })

  it('关键组都在:密钥、日志、三大语言与三大系统', () => {
    const ids = new Set(GITIGNORE_GROUPS.map((g) => g.id))
    for (const id of ['node', 'python', 'java', 'env', 'logs', 'os-mac', 'os-windows', 'os-linux']) {
      expect(ids.has(id), `缺少组 ${id}`).toBe(true)
    }
  })
})

describe('gitignore · mergeGitignore', () => {
  it('按选中组生成,带注释标题', () => {
    const out = mergeGitignore(['node'])
    expect(out).toContain('# Node.js')
    expect(out).toContain('node_modules/')
    expect(out.endsWith('\n')).toBe(true)
  })

  it('跨组重复行只保留一次', () => {
    // 'frontend' 与 'python' 都含 build/ 与 dist/
    const out = mergeGitignore(['frontend', 'python'])
    const buildLines = out.split('\n').filter((l) => l === 'build/')
    expect(buildLines).toHaveLength(1)
    const distLines = out.split('\n').filter((l) => l === 'dist/')
    expect(distLines).toHaveLength(1)
  })

  it('未选中任何组返回空串', () => {
    expect(mergeGitignore([])).toBe('')
    expect(mergeGitignore(['nope'])).toBe('')
  })

  it('多个组按模板顺序输出(非选择顺序)', () => {
    const out = mergeGitignore(['os-mac', 'node'])
    expect(out.indexOf('# Node.js')).toBeLessThan(out.indexOf('# macOS'))
  })
})
