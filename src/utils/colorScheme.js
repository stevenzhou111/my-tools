/**
 * 配色方案:从一个基色按色相环推导五类和谐配色(互补/邻近/三角/分裂互补/四角)。
 * 复用 colorScale 的 hex ↔ hsl 转换;保持基色的饱和度与明度,只转色相。
 */

import { hexToHsl, hslToHex } from './colorScale'

export const SCHEMES = [
  { id: 'complementary', label: '互补', deltas: [0, 180] },
  { id: 'analogous', label: '邻近', deltas: [-30, 0, 30] },
  { id: 'triadic', label: '三角色', deltas: [0, 120, 240] },
  { id: 'split', label: '分裂互补', deltas: [0, 150, 210] },
  { id: 'tetradic', label: '四角色', deltas: [0, 90, 180, 270] },
]

/**
 * 基色 → 五类方案。
 * @param {string} hex 基色
 * @returns {{base:string, schemes:{id:string,label:string,colors:string[]}[]}}
 */
export function colorScheme(hex) {
  const hsl = hexToHsl(hex)
  if (!hsl) throw new Error('请提供合法的十六进制颜色,如 #6366f1')
  return {
    base: hexToHsl(hex) && hslToHex(hsl.h, hsl.s, hsl.l),
    schemes: SCHEMES.map(({ id, label, deltas }) => ({
      id,
      label,
      colors: deltas.map((d) => hslToHex((hsl.h + d + 360) % 360, hsl.s, hsl.l)),
    })),
  }
}
