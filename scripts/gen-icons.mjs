// 一次性生成脚本:从 lucide-vue-next 提取指定图标的路径数据,写入 src/assets/icons.js
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const ICON_DIR = path.resolve('node_modules/lucide-vue-next/dist/esm/icons')

// 12 分类
const CATS = {
  convert: 'repeat',
  dev: 'wrench',
  text: 'file-text',
  image: 'image',
  generate: 'sparkles',
  calc: 'calculator',
  doc: 'files',
  dconv: 'arrow-left-right',
  av: 'clapperboard',
  chart: 'chart-column',
  office: 'paperclip',
  software: 'hard-drive',
}

// 86 工具
const TOOLS = {
  json: 'braces',
  base64: 'type',
  url: 'link',
  'html-entity': 'shield',
  radix: 'binary',
  'text-radix': 'text-cursor-input',
  'unicode-escape': 'globe',
  hash: 'hash',
  md5: 'lock',
  'url-parser': 'puzzle',
  jwt: 'ticket',
  'sm-crypto': 'shield-check',

  'sql-format': 'database',
  'yaml-json': 'settings',
  'cron-explainer': 'clock',
  'user-agent': 'scan-face',
  'http-status': 'traffic-cone',
  chmod: 'key-round',
  'aes-crypto': 'lock-keyhole',
  'file-hash': 'file-check',
  'subnet-calc': 'network',
  'json-tree': 'list-tree',
  'json-to-ts': 'brackets',
  favicon: 'component',
  'html-to-md': 'file-output',



  markdown: 'file-code',
  regex: 'regex',
  'text-stats': 'chart-column',
  'word-frequency': 'trending-up',
  'text-diff': 'git-compare-arrows',
  'text-replace': 'replace',
  'text-extract': 'magnet',
  'text-clean': 'paintbrush',
  'case-convert': 'case-sensitive',
  'text-reverse': 'undo-2',
  'whitespace-convert': 'arrow-down-up',
  morse: 'radio',
  'text-split': 'scissors',

  'image-compress': 'shrink',
  'image-base64': 'file-image',
  'image-corner': 'square-dashed',
  'image-rotate': 'rotate-cw',
  'image-border': 'frame',
  'image-filter': 'sliders-horizontal',
  'color-picker': 'pipette',
  'image-crop': 'crop',
  'image-merge': 'combine',
  'image-format': 'refresh-cw',
  'image-watermark': 'droplet',
  'image-grid': 'grid-3x3',
  'id-photo': 'contact',
  'image-exif': 'info',

  uuid: 'id-card',
  password: 'key',
  qrcode: 'qr-code',
  'url-qr': 'external-link',
  'wifi-qr': 'wifi',
  'qr-decode': 'scan-qr-code',
  barcode: 'barcode',
  'random-number': 'dice-5',
  'number-to-english': 'languages',
  'mock-data': 'flask-conical',

  timestamp: 'calendar-clock',
  color: 'palette',
  unit: 'ruler',
  roman: 'landmark',
  'date-calc': 'calendar-days',
  'rmb-uppercase': 'banknote',
  contrast: 'contrast',
  'tz-convert': 'earth',
  'docker-compose': 'container',
  totp: 'timer-reset',
  'gif-maker': 'image-play',
  xml2json: 'repeat-2',
  keycode: 'keyboard',
  pangu: 'text-quote',
  mortgage: 'piggy-bank',
  stopwatch: 'alarm-clock',
  'sort-lines': 'arrow-down-wide-narrow',
  lorem: 'pilcrow',
  'color-shades': 'swatch-book',
  'cam-mic-test': 'webcam',
  'cron-builder': 'hourglass',
  'rate-convert': 'percent',
  'palette-extract': 'paint-bucket',


  'pdf-merge': 'files',
  'pdf-organize': 'rows-3',
  'pdf-watermark': 'stamp',
  'pdf-page-number': 'list-ordered',
  'image-to-pdf': 'printer',
  'excel-convert': 'sheet',
  'json-excel': 'table',
  'excel-merge': 'library',

  'pdf-to-image': 'images',
  'pdf-extract': 'scan-text',
  'pdf-compress': 'archive',
  'word-to-html': 'file-type',
  'excel-export': 'image-down',
  'format-convert': 'arrow-left-right',
  'xml-format': 'code-xml',

  tts: 'mic',
  'video-frame': 'camera',
  'audio-edit': 'sliders-vertical',
  'screen-record': 'monitor-play',

  chart: 'chart-line',

  pomodoro: 'timer',
  decision: 'compass',
  'drawing-pad': 'pen-tool',
  zip: 'package',
  gradient: 'aperture',

  'software-recommend': 'app-window',
}

// 界面 chrome 图标。key 必须等于 value(也就是图标真名),
// 组件里写 <AppIcon name="star" /> 只会按图标真名查找,这里起别名会取不到。
const UI = {
  'layout-grid': 'layout-grid',
  search: 'search',
  menu: 'menu',
  sun: 'sun',
  moon: 'moon',
  house: 'house',
  star: 'star',
  'star-off': 'star-off',
  clock: 'clock',
  'rotate-cw': 'rotate-cw',
  'arrow-left': 'arrow-left',
  'arrow-right': 'arrow-right',
  'wifi-off': 'wifi-off',
  info: 'info',
  clipboard: 'clipboard',
  keyboard: 'keyboard',
  shuffle: 'shuffle',
  x: 'x',
  'chevron-down': 'chevron-down',
  'chevron-right': 'chevron-right',
}

// 软件推荐的 8 个子分类
const SOFT_CATS = {
  system: 'settings',
  dev: 'code-xml',
  office: 'file-text',
  media: 'clapperboard',
  net: 'globe',
  remote: 'monitor',
  security: 'shield-check',
  backup: 'database-backup',
  ime: 'keyboard',
  ext: 'puzzle',
  mail: 'mail',
  vm: 'box',
  transfer: 'folder-symlink',
  disk: 'hard-drive',
}

// UA 解析结果分组(按中文标题匹配)
const UA_GROUPS = {
  browser: 'globe',
  os: 'monitor',
  device: 'smartphone',
  engine: 'cog',
  arch: 'cpu',
}

// 注意:必须按「值」收集而不是对象展开合并 —— dev / office / chart 等 id
// 在 CATS、TOOLS、SOFT_CATS 之间重名,对象展开会静默覆盖掉另一侧的映射。
const ALL_VALUES = [
  ...Object.values(CATS),
  ...Object.values(TOOLS),
  ...Object.values(UI),
  ...Object.values(SOFT_CATS),
  ...Object.values(UA_GROUPS),
]

const missing = [...new Set(ALL_VALUES)].filter(
  (name) => !fs.existsSync(path.join(ICON_DIR, `${name}.js`)),
)
if (missing.length) {
  console.error('缺失的 lucide 图标:')
  for (const name of missing) console.error(`  ${name}`)
  process.exit(1)
}

// 调用图标组件取出 iconNode 数组
const nodes = {}
for (const name of new Set(ALL_VALUES)) {
  const mod = await import(pathToFileURL(path.join(ICON_DIR, `${name}.js`)).href)
  const comp = mod.default
  const vnode = comp({}, { slots: {}, attrs: {} })
  nodes[name] = vnode.props.iconNode.map(([tag, attrs]) => {
    const { key, ...rest } = attrs // 渲染用的 key 不需要保留
    return [tag, rest]
  })
}

const names = Object.keys(nodes).sort()

const body = `// 本文件由 _gen_icons.mjs 生成,请勿手工编辑。
// 图标取自 lucide (ISC License) https://lucide.dev — 已裁剪为纯路径数据,
// 避免为上百个图标引入组件运行时代码。

export const ICONS = {
${names.map((n) => `  ${JSON.stringify(n)}: ${JSON.stringify(nodes[n])},`).join('\n')}
}

export const ICON_NAMES = [
${names.map((n) => `  ${JSON.stringify(n)},`).join('\n')}
]
`

fs.writeFileSync('src/assets/icons.js', body, 'utf8')
console.log(`已写入 src/assets/icons.js:${Object.keys(nodes).length} 个图标(去重后 ${new Set(ALL_VALUES).size} 个)`)

// ---------- 同步改写各处的 icon 字段:emoji -> lucide 图标名 ----------

const report = { registry: 0, software: 0, ua: 0, unknown: [] }

// 1) registry.js:分类与工具
{
  const p = 'src/tools/registry.js'
  let s = fs.readFileSync(p, 'utf8')
  s = s.replace(/(\{ id: '(\w+)', name: '[^']+', icon: )'[^']*'/g, (m, head, id) => {
    if (!CATS[id]) {
      report.unknown.push(`cat:${id}`)
      return m
    }
    report.registry++
    return `${head}'${CATS[id]}'`
  })
  s = s.replace(
    /(id: '([\w-]+)', name: '[^']+', category: '\w+', icon: )'[^']*'/g,
    (m, head, id) => {
      if (!TOOLS[id]) {
        report.unknown.push(`tool:${id}`)
        return m
      }
      report.registry++
      return `${head}'${TOOLS[id]}'`
    },
  )
  fs.writeFileSync(p, s, 'utf8')
}

// 2) data/software.js:软件子分类
{
  const p = 'src/data/software.js'
  let s = fs.readFileSync(p, 'utf8')
  s = s.replace(/(\{ id: '(\w+)', name: '[^']+', icon: )'[^']*'/g, (m, head, id) => {
    if (!SOFT_CATS[id]) {
      report.unknown.push(`soft:${id}`)
      return m
    }
    report.software++
    return `${head}'${SOFT_CATS[id]}'`
  })
  fs.writeFileSync(p, s, 'utf8')
}

// 3) UserAgentParser.vue:按中文标题替换分组图标
{
  const p = 'src/tools/user-agent/UserAgentParser.vue'
  let s = fs.readFileSync(p, 'utf8')
  const TITLE_MAP = { 浏览器: 'browser', 操作系统: 'os', 设备: 'device', 渲染引擎: 'engine', 'CPU 架构': 'arch' }
  s = s.replace(/icon: '[^']*',\s*\n(\s*)title: '([^']+)'/g, (m, indent, title) => {
    const key = TITLE_MAP[title]
    if (!key) {
      report.unknown.push(`ua:${title}`)
      return m
    }
    report.ua++
    return `icon: '${UA_GROUPS[key]}',\n${indent}title: '${title}'`
  })
  s = s.replace(/\{\s*icon: '[^']*',\s*\n(\s*)title: '设备'/g, (m, indent) => {
    report.ua++
    return `{\n${indent}icon: '${UA_GROUPS.device}',\n${indent}title: '设备'`
  })
  fs.writeFileSync(p, s, 'utf8')
}

console.log(
  `已改写 icon 字段 — registry:${report.registry}, software:${report.software}, ua:${report.ua}`,
)
if (report.unknown.length) {
  console.error('未覆盖的条目:', report.unknown.join(', '))
  process.exit(1)
}