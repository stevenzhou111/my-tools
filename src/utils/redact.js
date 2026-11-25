/**
 * 图片局部打码的纯几何逻辑;Canvas 像素操作留在组件里,方便单测边界情况。
 */

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
}

function finite(n) {
  return Number.isFinite(n) ? n : 0
}

/** 把拖拽起止点归一化为限制在图像范围内的整数矩形(反向拖拽也正确)。 */
export function normalizeRect(start, end, width, height) {
  const w = Math.max(0, finite(width))
  const h = Math.max(0, finite(height))
  const x1 = clamp(Math.min(finite(start?.x), finite(end?.x)), 0, w)
  const y1 = clamp(Math.min(finite(start?.y), finite(end?.y)), 0, h)
  const x2 = clamp(Math.max(finite(start?.x), finite(end?.x)), 0, w)
  const y2 = clamp(Math.max(finite(start?.y), finite(end?.y)), 0, h)
  return {
    x: Math.round(x1),
    y: Math.round(y1),
    w: Math.round(x2 - x1),
    h: Math.round(y2 - y1),
  }
}

/** 过小的框(误触)不记录,避免生成看不见的覆盖层。 */
export function isEmptyRect(rect, min = 2) {
  return !rect || rect.w < min || rect.h < min
}

/** 马赛克块大小:强度 0~100 映射到 2~30 个原图像素。 */
export function mosaicBlock(strength) {
  const s = clamp(Number(strength) || 0, 0, 100)
  return Math.max(2, Math.round(2 + (s / 100) * 28))
}