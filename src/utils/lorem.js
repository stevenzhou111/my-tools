/**
 * Lorem Ipsum 假文生成:内置词库 + 组合规则,纯随机拼装,
 * 用于排版占位。不依赖网络。
 */

const WORDS = `lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum perspiciatis unde omnis iste natus error voluptatem accusantium doloremque laudantium totam rem aperiam eaque ipsa quae ab illo inventore veritatis quasi architecto beatae vitae dicta explicabo nemo ipsam quia voluptas aspernatur aut odit fugit consequuntur magni dolores eos ratione sequi nesciunt neque porro quisquam dolorem adipisci numquam eius modi tempora incidunt magnam quaerat etiam nulla facilisis at vero eros accumsan iusto dignissim blandit praesent tincidunt hac habitasse platea dictumst`

const LIST = WORDS.split(' ')

function rand(max) {
  return crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296 * max
}

function pick() {
  return LIST[Math.floor(rand(LIST.length))]
}

/** 一句 6~14 个词,首词大写,以句号/问号/叹号结尾(逗号不收尾,保证段落按句可拆) */
export function loremSentence() {
  const n = 6 + Math.floor(rand(9))
  const words = Array.from({ length: n }, pick)
  const end = ['.', '.', '.', '?', '!'][Math.floor(rand(5))]
  const s = words.join(' ') + end
  return s[0].toUpperCase() + s.slice(1)
}

/** 一段 3~6 句 */
export function loremParagraph() {
  const n = 3 + Math.floor(rand(4))
  return Array.from({ length: n }, loremSentence).join(' ')
}

/**
 * 生成假文。
 * @param {object} opts
 * @param {'paragraphs'|'sentences'} opts.unit 按段落还是按句
 * @param {number} opts.count 数量(1~50)
 * @param {boolean} opts.classicStart 以经典的 "Lorem ipsum dolor sit amet..." 开头
 * @param {boolean} opts.html 用 <p> 标签包裹(仅段落模式)
 */
export function lorem({ unit = 'paragraphs', count = 3, classicStart = true, html = false } = {}) {
  const raw = Math.floor(Number(count))
  const n = Math.min(50, Math.max(1, Number.isFinite(raw) ? raw : 3))
  if (unit === 'sentences') {
    const out = Array.from({ length: n }, loremSentence)
    if (classicStart) {
      out[0] = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ' + out[0]
    }
    return out.join(' ')
  }
  const paras = Array.from({ length: n }, loremParagraph)
  if (classicStart) {
    paras[0] = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ' + paras[0]
  }
  if (html) return paras.map((p) => `<p>${p}</p>`).join('\n\n')
  return paras.join('\n\n')
}
