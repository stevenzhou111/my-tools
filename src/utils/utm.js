/**
 * UTM 链接生成:营销渠道归因参数(utm_source/medium/campaign/term/content)。
 * 基于 URL API:保留既有查询参数与 #hash,旧的 utm_* 先清除避免叠加。
 */

export const UTM_FIELDS = [
  { key: 'utm_source', label: '来源 source', placeholder: 'google, wechat, newsletter' },
  { key: 'utm_medium', label: '媒介 medium', placeholder: 'cpc, banner, email, social' },
  { key: 'utm_campaign', label: '活动 campaign', placeholder: 'spring_sale, launch_2026' },
  { key: 'utm_term', label: '关键词 term', placeholder: '可选,付费搜索关键词' },
  { key: 'utm_content', label: '内容 content', placeholder: '可选,A/B 测试区分素材' },
]

/**
 * 构建 UTM 链接。
 * @param {string} url 原始链接(http/https)
 * @param {Record<string,string>} utm utm_* → 值(空/纯空白跳过)
 * @returns {string}
 */
export function buildUtmUrl(url, utm = {}) {
  let u
  try {
    u = new URL(String(url).trim())
  } catch {
    throw new Error('请输入合法的 http/https 链接')
  }
  if (!/^https?:$/.test(u.protocol)) throw new Error('仅支持 http/https 链接')
  for (const { key } of UTM_FIELDS) u.searchParams.delete(key)
  for (const { key } of UTM_FIELDS) {
    const v = String(utm[key] ?? '').trim()
    if (v) u.searchParams.set(key, v)
  }
  return u.toString()
}
