// 图标提取脚本:从源码自动收集用到的 lucide 图标名,生成 src/assets/icons.js。
// 收集来源 = registry.js / data/software.js 的 icon 字段 + 各组件 <AppIcon> 的
// 静态 name、:name 表达式内的字符串字面量、脚本内 *icon: '...' 字段。
// 新增工具无需再手工同步清单;校验不通过(引用了不存在的图标)时先报错退出,不写盘。
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

const ICON_DIR = path.resolve('node_modules/lucide-vue-next/dist/esm/icons')
const lucideExists = (n) => fs.existsSync(path.join(ICON_DIR, `${n}.js`))

const names = new Set()

// 1) registry 与软件数据的 icon 字段
for (const p of ['src/tools/registry.js', 'src/data/software.js']) {
  for (const m of fs.readFileSync(p, 'utf8').matchAll(/\bicon: '([\w-]+)'/g)) names.add(m[1])
}

// 2) 组件:AppIcon 的 name / :name,以及脚本里的 icon:/xxxIcon: 字段
// 注意 git pathspec 的 src/**/*.vue 不匹配顶层 src/App.vue,要加 src/*.vue
const vueFiles = execSync('git ls-files "src/*.vue" "src/**/*.vue"', { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
  .map((f) => f.replaceAll('\\', '/'))

for (const file of vueFiles) {
  const s = fs.readFileSync(file, 'utf8')
  for (const tag of s.matchAll(/<AppIcon\b[^>]*>/g)) {
    for (const m of tag[0].matchAll(/\s(:?)name="([^"]*)"/g)) {
      const isBound = m[1]
      if (isBound) {
        // :name="theme === 'dark' ? 'sun' : 'moon'" — 表达式里可能有非图标的字符串
        // (如比较值),只保留真实存在的 lucide 图标名
        for (const lit of m[2].matchAll(/'([\w-]+)'/g)) {
          if (lucideExists(lit[1])) names.add(lit[1])
        }
      } else if (/^[\w-]+$/.test(m[2])) {
        names.add(m[2])
      }
    }
  }
  for (const m of s.matchAll(/\b\w*[iI]con: '([\w-]+)'/g)) names.add(m[1])
}

const ALL = [...names].filter(Boolean)
if (!ALL.length) {
  console.error('没有收集到任何图标名,检查扫描规则')
  process.exit(1)
}

const missing = [...new Set(ALL)].filter((name) => !fs.existsSync(path.join(ICON_DIR, `${name}.js`)))
if (missing.length) {
  console.error('缺失的 lucide 图标(先确认名称正确或替换为存在图标):')
  for (const name of missing) console.error(`  ${name}`)
  process.exit(1)
}

// 调用图标组件取出 iconNode 数组
const nodes = {}
for (const name of new Set(ALL)) {
  const mod = await import(pathToFileURL(path.join(ICON_DIR, `${name}.js`)).href)
  const comp = mod.default
  const vnode = comp({}, { slots: {}, attrs: {} })
  nodes[name] = vnode.props.iconNode.map(([tag, attrs]) => {
    const { key, ...rest } = attrs // 渲染用的 key 不需要保留
    return [tag, rest]
  })
}

const namesSorted = Object.keys(nodes).sort()

const body = `// 本文件由 gen-icons.mjs 生成,请勿手工编辑。
// 图标取自 lucide (ISC License) https://lucide.dev — 已裁剪为纯路径数据,
// 避免为上百个图标引入组件运行时代码。

export const ICONS = {
${namesSorted.map((n) => `  ${JSON.stringify(n)}: ${JSON.stringify(nodes[n])},`).join('\n')}
}

export const ICON_NAMES = [
${namesSorted.map((n) => `  ${JSON.stringify(n)},`).join('\n')}
]
`

fs.writeFileSync('src/assets/icons.js', body, 'utf8')
console.log(`已写入 src/assets/icons.js:${namesSorted.length} 个图标(源码扫描收集)`)
