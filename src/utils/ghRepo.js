/**
 * GitHub 仓库信息:api.github.com(免登录 60 次/小时,CORS 开放)。
 * 输入支持 owner/repo 或任意 GitHub 页面链接;仓库信息缓存 30 分钟。
 */

const TTL_MS = 30 * 60 * 1000

/**
 * 从用户输入解析 owner/repo。
 * 支持:vuejs/core、https://github.com/vuejs/core、github.com/vuejs/core/tree/main、
 *       https://github.com/vuejs/core/blob/main/src/index.ts、结尾的 .git 与斜杠。
 * @returns {{error:string, slug:string}|{error:'', slug:'owner/repo'}}
 */
export function parseRepoInput(input) {
  let s = String(input || '').trim()
  if (!s) return { error: '请输入仓库,如 vuejs/core' }
  s = s.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\.git$/i, '').replace(/\/+$/, '')
  // 带域名的形式:必须且只能是 github.com(其他 git 托管站明确报错,不做静默截取)
  const hostMatch = /^([\w.-]+)\//.exec(s)
  if (hostMatch && hostMatch[1].includes('.')) {
    if (hostMatch[1].toLowerCase() !== 'github.com') return { error: '仅支持 GitHub 仓库链接(github.com/...)' }
    s = s.slice(hostMatch[0].length)
  }
  s = s.split(/[?#]/)[0]
  // 去掉子路径(/tree/main、/blob/...、/issues 等)
  const parts = s.split('/').filter(Boolean)
  if (parts.length < 2) return { error: '需要 owner/repo 两段,如 vuejs/core' }
  const slug = `${parts[0]}/${parts[1]}`
  if (!/^[\w.-]+\/[\w.-]+$/.test(slug)) return { error: 'owner/repo 只能包含字母数字点横线与下划线' }
  return { error: '', slug }
}

/** 数字缩写:1234 → 1.2k,12000 → 12k */
export function formatCount(n) {
  if (!Number.isFinite(n)) return '—'
  if (n < 1000) return String(n)
  if (n < 1_000_000) return `${+(n / 1000).toFixed(1)}k`
  return `${+(n / 1_000_000).toFixed(1)}m`
}

function cacheKey(slug) {
  return `toolbox-ghrepo:${slug.toLowerCase()}`
}

function readCache(key, now) {
  try {
    const v = JSON.parse(localStorage.getItem(key) || 'null')
    if (v && typeof v.fetchedAt === 'number') return { ...v, fresh: now - v.fetchedAt < TTL_MS }
  } catch { /* 忽略 */ }
  return null
}

function writeCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch { /* 忽略 */ }
}

/**
 * 拉取仓库信息 + 最新 release。
 * @returns {Promise<{error:string, data:object|null, stale:boolean, fetchedAt:number}>}
 */
export async function fetchRepo(input, { now = Date.now() } = {}) {
  const parsed = parseRepoInput(input)
  if (parsed.error) return { error: parsed.error, data: null, stale: false, fetchedAt: 0 }
  const slug = parsed.slug
  const key = cacheKey(slug)
  const cached = readCache(key, now)
  if (cached?.fresh) return { error: '', data: cached.data, stale: false, fetchedAt: cached.fetchedAt }

  try {
    const res = await fetch(`https://api.github.com/repos/${slug}`, {
      headers: { accept: 'application/vnd.github+json' },
    })
    if (res.status === 404) return { error: `仓库不存在:${slug}(私有仓库未登录不可见)`, data: null, stale: false, fetchedAt: 0 }
    if (res.status === 403) return { error: 'GitHub API 匿名额度已用完(60 次/小时),一小时后自动恢复', data: null, stale: false, fetchedAt: 0 }
    if (!res.ok) throw new Error(`GitHub 返回 ${res.status}`)
    const d = await res.json()

    // 最新 release 是增强信息:失败不影响主体
    let release = null
    try {
      const rr = await fetch(`https://api.github.com/repos/${slug}/releases/latest`, {
        headers: { accept: 'application/vnd.github+json' },
      })
      if (rr.ok) {
        const rd = await rr.json()
        release = { tag: rd.tag_name, date: rd.published_at ? String(rd.published_at).slice(0, 10) : '', url: rd.html_url }
      }
    } catch { /* 忽略 */ }

    const data = {
      slug: d.full_name,
      description: d.description || '',
      stars: d.stargazers_count,
      forks: d.forks_count,
      openIssues: d.open_issues_count,
      watchers: d.subscribers_count ?? d.watchers_count,
      language: d.language || '',
      license: d.license?.spdx_id || '无',
      defaultBranch: d.default_branch || 'main',
      createdAt: String(d.created_at).slice(0, 10),
      pushedAt: String(d.pushed_at).slice(0, 10),
      homepage: d.homepage || '',
      url: d.html_url,
      topics: d.topics || [],
      release,
    }
    const out = { data, fetchedAt: now }
    writeCache(key, out)
    return { error: '', ...out, stale: false }
  } catch (e) {
    if (cached) return { error: `网络获取失败(${e.message}),已回退缓存`, data: cached.data, stale: true, fetchedAt: cached.fetchedAt }
    return { error: `获取失败:${e.message}。请检查网络后重试;本工具需要联网。`, data: null, stale: false, fetchedAt: 0 }
  }
}
