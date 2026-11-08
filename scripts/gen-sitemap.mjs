// 构建后生成 sitemap.xml:首页 + 全部工具页的绝对地址。
// sitemap 协议要求绝对 URL,而本仓库不含部署域名,因此仅在设置 SITEMAP_BASE 时输出,
// 例如:SITEMAP_BASE=https://tools.example.com npm run build
import fs from 'node:fs'
import path from 'node:path'

const base = process.env.SITEMAP_BASE
if (!base) {
  console.log('未设置 SITEMAP_BASE,跳过 sitemap.xml 生成(robots.txt 已就位)')
  process.exit(0)
}

// registry 已按分类拆分:聚合读取 src/tools/registry/ 下全部 js(条目 id 的声明格式保持一致)
const REG_DIR = 'src/tools/registry'
const source = fs
  .readdirSync(REG_DIR)
  .filter((f) => f.endsWith('.js'))
  .sort()
  .map((f) => fs.readFileSync(path.join(REG_DIR, f), 'utf8'))
  .join('\n')
const ids = [...source.matchAll(/^    id: '([\w-]+)'/gm)].map((m) => m[1])
if (!ids.length) {
  console.error('没有从 registry/ 解析到任何工具 id,检查匹配规则')
  process.exit(1)
}
if (new Set(ids).size !== ids.length) {
  console.error('解析到重复的工具 id,检查 registry/ 条目')
  process.exit(1)
}

const urls = [
  { loc: `${base}/`, priority: '1.0' },
  ...ids.map((id) => ({ loc: `${base}/tool/${id}`, priority: '0.8' })),
]

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>\n    <loc>${u.loc}</loc>\n    <priority>${u.priority}</priority>\n  </url>`).join('\n')}
</urlset>
`

fs.writeFileSync(path.join('dist', 'sitemap.xml'), xml, 'utf8')
console.log(`已生成 dist/sitemap.xml:${urls.length} 个地址`)
