/**
 * HTML 常用命名实体速查:按用途分组,点击复制实体写法或字符本身。
 * 名称与实体均为 HTML 标准定义,可放心用于任何 HTML 文档。
 */

export const ENTITY_GROUPS = [
  {
    id: 'basic', label: '必转义(写 HTML 必会)',
    items: [
      { name: 'and, and sign', entity: '&amp;', char: '&' },
      { name: 'less than', entity: '&lt;', char: '<' },
      { name: 'greater than', entity: '&gt;', char: '>' },
      { name: 'quotation mark', entity: '&quot;', char: '"' },
      { name: 'apostrophe', entity: '&apos;', char: "'" },
      { name: 'non-breaking space', entity: '&nbsp;', char: ' ' },
    ],
  },
  {
    id: 'punct', label: '标点与排版',
    items: [
      { name: 'left double quote', entity: '&ldquo;', char: '“' },
      { name: 'right double quote', entity: '&rdquo;', char: '”' },
      { name: 'left single quote', entity: '&lsquo;', char: '‘' },
      { name: 'right single quote', entity: '&rsquo;', char: '’' },
      { name: 'left angle quote', entity: '&laquo;', char: '«' },
      { name: 'right angle quote', entity: '&raquo;', char: '»' },
      { name: 'ellipsis', entity: '&hellip;', char: '…' },
      { name: 'em dash', entity: '&mdash;', char: '—' },
      { name: 'en dash', entity: '&ndash;', char: '–' },
      { name: 'soft hyphen', entity: '&shy;', char: '­' },
      { name: 'bullet', entity: '&bull;', char: '•' },
      { name: 'middle dot', entity: '&middot;', char: '·' },
      { name: 'section sign', entity: '&sect;', char: '§' },
      { name: 'pilcrow', entity: '&para;', char: '¶' },
      { name: 'dagger', entity: '&dagger;', char: '†' },
      { name: 'per mille sign', entity: '&permil;', char: '‰' },
    ],
  },
  {
    id: 'math', label: '数学与单位',
    items: [
      { name: 'plus-minus', entity: '&plusmn;', char: '±' },
      { name: 'minus sign', entity: '&minus;', char: '−' },
      { name: 'multiplication', entity: '&times;', char: '×' },
      { name: 'division', entity: '&divide;', char: '÷' },
      { name: 'degree', entity: '&deg;', char: '°' },
      { name: 'micro sign', entity: '&micro;', char: 'µ' },
      { name: 'not equal', entity: '&ne;', char: '≠' },
      { name: 'less-or-equal', entity: '&le;', char: '≤' },
      { name: 'greater-or-equal', entity: '&ge;', char: '≥' },
      { name: 'approximately', entity: '&asymp;', char: '≈' },
      { name: 'equivalent', entity: '&equiv;', char: '≡' },
      { name: 'superscript two', entity: '&sup2;', char: '²' },
      { name: 'superscript three', entity: '&sup3;', char: '³' },
      { name: 'square root', entity: '&radic;', char: '√' },
      { name: 'infinity', entity: '&infin;', char: '∞' },
      { name: 'n-ary summation', entity: '&sum;', char: '∑' },
      { name: 'n-ary product', entity: '&prod;', char: '∏' },
      { name: 'integral', entity: '&int;', char: '∫' },
      { name: 'partial differential', entity: '&part;', char: '∂' },
      { name: 'one half', entity: '&frac12;', char: '½' },
      { name: 'one quarter', entity: '&frac14;', char: '¼' },
      { name: 'three quarters', entity: '&frac34;', char: '¾' },
    ],
  },
  {
    id: 'arrows', label: '箭头',
    items: [
      { name: 'leftwards arrow', entity: '&larr;', char: '←' },
      { name: 'upwards arrow', entity: '&uarr;', char: '↑' },
      { name: 'rightwards arrow', entity: '&rarr;', char: '→' },
      { name: 'downwards arrow', entity: '&darr;', char: '↓' },
      { name: 'left right arrow', entity: '&harr;', char: '↔' },
      { name: 'down-up arrow', entity: '&varr;', char: '↕' },
      { name: 'rightwards double arrow', entity: '&rArr;', char: '⇒' },
      { name: 'leftwards double arrow', entity: '&lArr;', char: '⇐' },
    ],
  },
  {
    id: 'currency', label: '货币',
    items: [
      { name: 'euro sign', entity: '&euro;', char: '€' },
      { name: 'pound sign', entity: '&pound;', char: '£' },
      { name: 'yen sign', entity: '&yen;', char: '¥' },
      { name: 'cent sign', entity: '&cent;', char: '¢' },
      { name: 'currency sign', entity: '&curren;', char: '¤' },
      { name: 'rouble sign', entity: '&rub;', char: '₽' },
    ],
  },
  {
    id: 'greek', label: '希腊字母',
    items: [
      { name: 'alpha', entity: '&alpha;', char: 'α' },
      { name: 'beta', entity: '&beta;', char: 'β' },
      { name: 'gamma', entity: '&gamma;', char: 'γ' },
      { name: 'Delta', entity: '&Delta;', char: 'Δ' },
      { name: 'delta', entity: '&delta;', char: 'δ' },
      { name: 'epsilon', entity: '&epsilon;', char: 'ε' },
      { name: 'theta', entity: '&theta;', char: 'θ' },
      { name: 'lambda', entity: '&lambda;', char: 'λ' },
      { name: 'mu', entity: '&mu;', char: 'μ' },
      { name: 'pi', entity: '&pi;', char: 'π' },
      { name: 'Sigma', entity: '&Sigma;', char: 'Σ' },
      { name: 'sigma', entity: '&sigma;', char: 'σ' },
      { name: 'phi', entity: '&phi;', char: 'φ' },
      { name: 'psi', entity: '&psi;', char: 'ψ' },
      { name: 'omega', entity: '&omega;', char: 'ω' },
      { name: 'Omega', entity: '&Omega;', char: 'Ω' },
    ],
  },
  {
    id: 'legal', label: '版权与法律',
    items: [
      { name: 'copyright', entity: '&copy;', char: '©' },
      { name: 'registered', entity: '&reg;', char: '®' },
      { name: 'trademark', entity: '&trade;', char: '™' },
    ],
  },
]

/** 全部条目拍平(搜索用) */
export function allEntities() {
  return ENTITY_GROUPS.flatMap((g) => g.items.map((it) => ({ ...it, group: g.label, groupId: g.id })))
}
