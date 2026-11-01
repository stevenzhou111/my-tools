import { describe, expect, it, beforeEach, vi } from 'vitest'
import { fetchRepo, parseRepoInput, formatCount } from '@/utils/ghRepo'

const RAW_REPO = {
  full_name: 'vuejs/core', description: 'Vue.js framework', stargazers_count: 48500,
  forks_count: 8600, open_issues_count: 520, subscribers_count: 700, watchers_count: 700,
  language: 'TypeScript', license: { spdx_id: 'MIT' }, default_branch: 'main',
  created_at: '2019-12-02T08:00:00Z', pushed_at: '2026-10-30T10:00:00Z',
  homepage: 'https://vuejs.org', html_url: 'https://github.com/vuejs/core', topics: ['vue', 'framework'],
}

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('ghRepo · parseRepoInput', () => {
  it.each([
    ['vuejs/core', 'vuejs/core'],
    ['  vuejs/core  ', 'vuejs/core'],
    ['https://github.com/vuejs/core', 'vuejs/core'],
    ['github.com/vuejs/core/tree/main', 'vuejs/core'],
    ['https://www.github.com/vuejs/core/blob/main/src/index.ts', 'vuejs/core'],
    ['https://github.com/vuejs/core.git', 'vuejs/core'],
    ['https://github.com/vuejs/core?tab=readme', 'vuejs/core'],
  ])('%s → %s', (input, expected) => {
    expect(parseRepoInput(input)).toEqual({ error: '', slug: expected })
  })

  it('非法输入报错', () => {
    expect(parseRepoInput('').error).toBeTruthy()
    expect(parseRepoInput('vuejs').error).toBeTruthy()
    expect(parseRepoInput('https://gitlab.com/a/b').error).toContain('GitHub')
  })
})

describe('ghRepo · formatCount', () => {
  it('千位缩写', () => {
    expect(formatCount(999)).toBe('999')
    expect(formatCount(1234)).toBe('1.2k')
    expect(formatCount(12000)).toBe('12k')
    expect(formatCount(48500)).toBe('48.5k')
    expect(formatCount(1200000)).toBe('1.2m')
    expect(formatCount('x')).toBe('—')
  })
})

describe('ghRepo · fetchRepo', () => {
  it('拉取仓库字段并归一化', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      if (String(url).includes('/releases/latest')) {
        return { ok: true, json: async () => ({ tag_name: 'v3.5.0', published_at: '2026-09-03T00:00:00Z', html_url: 'https://github.com/vuejs/core/releases/tag/v3.5.0' }) }
      }
      return { ok: true, json: async () => RAW_REPO }
    }))
    const r = await fetchRepo('vuejs/core')
    expect(r.error).toBe('')
    expect(r.data.stars).toBe(48500)
    expect(r.data.license).toBe('MIT')
    expect(r.data.release.tag).toBe('v3.5.0')
  })

  it('404 → 仓库不存在', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404 })))
    const r = await fetchRepo('a/b')
    expect(r.error).toContain('不存在')
  })

  it('403 → 额度提示', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 403 })))
    const r = await fetchRepo('a/b')
    expect(r.error).toContain('60 次/小时')
  })

  it('release 接口失败不影响主体', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      if (String(url).includes('/releases/')) throw new Error('down')
      return { ok: true, json: async () => RAW_REPO }
    }))
    const r = await fetchRepo('vuejs/core')
    expect(r.data.release).toBeNull()
    expect(r.data.stars).toBe(48500)
  })
})

describe('ghRepo · 缓存', () => {
  it('30 分钟内命中缓存,省 API 额度', async () => {
    const now = 1e12
    const spy = vi.fn(async () => ({ ok: true, json: async () => RAW_REPO }))
    vi.stubGlobal('fetch', spy)
    await fetchRepo('vuejs/core', { now })
    await fetchRepo('vuejs/core', { now: now + 20 * 60 * 1000 })
    expect(spy).toHaveBeenCalledTimes(2) // repo + release 各一次,第二次全部走缓存
  })

  it('过期断网回退缓存', async () => {
    const now = 1e12
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => RAW_REPO })))
    await fetchRepo('vuejs/core', { now })
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    const r = await fetchRepo('vuejs/core', { now: now + 60 * 60 * 1000 })
    expect(r.stale).toBe(true)
    expect(r.data.slug).toBe('vuejs/core')
  })
})
