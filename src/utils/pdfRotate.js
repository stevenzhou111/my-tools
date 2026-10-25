import { degrees } from 'pdf-lib'

/**
 * /Rotate 页面的坐标补偿:pdf-lib 的 drawText/drawImage 画在未旋转的用户空间,
 * 带 /Rotate 90/180/270 的扫描件会让页码/水印横躺错位。
 * 这里提供"显示坐标系"(用户看到的页面,原点左下)到未旋转空间的锚点映射,
 * 以及让文字在显示时直立所需的旋转角。
 */

function rotation(page) {
  return ((page.getRotation().angle % 360) + 360) % 360
}

/** 页面在阅读器里显示的尺寸(90/270 时宽高互换) */
export function rotatedSize(page) {
  const { width, height } = page.getSize()
  const swapped = rotation(page) === 90 || rotation(page) === 270
  return swapped ? { width: height, height: width } : { width, height }
}

/** 显示坐标 (xd, yd) → 未旋转空间锚点 + 直立旋转角 */
export function uprightAnchor(page, xd, yd) {
  const { width: W, height: H } = page.getSize()
  switch (rotation(page)) {
    case 90:
      return { x: W - yd, y: xd, rotate: degrees(90) }
    case 180:
      return { x: W - xd, y: H - yd, rotate: degrees(180) }
    case 270:
      return { x: yd, y: H - xd, rotate: degrees(270) }
    default:
      return { x: xd, y: yd, rotate: degrees(0) }
  }
}
