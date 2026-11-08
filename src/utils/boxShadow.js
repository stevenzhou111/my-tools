/**
 * box-shadow CSS 生成:单层/内阴影参数 → 标准语法,供组件直接输出。
 * 颜色接受 #rrggbb,透明度独立控制(输出 rgba)。
 */

/** hex(#rgb/#rrggbb)+ 0~100 不透明度 → rgba() 字符串;非法返回 rgba(0,0,0,1) */
export function hexToRgba(hex, opacityPct = 100) {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex || '').trim())
  const a = Math.min(1, Math.max(0, (Number(opacityPct) || 0) / 100))
  if (!m) return `rgba(0, 0, 0, ${a})`
  let h = m[1]
  if (h.length === 3) h = [...h].map((c) => c + c).join('')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

/**
 * 生成 box-shadow 声明(不含属性名)。
 * @param {{x?:number,y?:number,blur?:number,spread?:number,color?:string,opacity?:number,inset?:boolean}} o
 * @returns {string}
 */
export function boxShadowCss(o = {}) {
  const num = (v) => (Number.isFinite(Number(v)) ? `${Number(v)}px` : '0px')
  const parts = [
    o.inset ? 'inset' : '',
    num(o.x),
    num(o.y),
    num(o.blur),
    num(o.spread),
    hexToRgba(o.color ?? '#000000', o.opacity ?? 100),
  ].filter(Boolean)
  return parts.join(' ')
}
