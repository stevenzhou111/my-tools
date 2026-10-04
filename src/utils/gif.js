/**
 * GIF 合成:基于 gifenc(纯 JS,无 worker)。
 * 帧输入为 RGBA 像素数据;每帧独立调色板量化,保证色彩质量。
 */
import { GIFEncoder, quantize, applyPalette } from 'gifenc'

/**
 * @param {Array<{rgba:Uint8Array,width:number,height:number,delay?:number}>} frames
 * @param {{transparent?:boolean}} opts transparent 为 true 时把 alpha<128 的像素转成透明(适合表情包)
 * @returns {Promise<Blob>} image/gif
 */
export async function framesToGifBlob(frames, { transparent = false } = {}) {
  if (!frames.length) throw new Error('至少需要一帧')
  const gif = GIFEncoder()
  const format = transparent ? 'rgba4444' : 'rgb565'

  for (const frame of frames) {
    const { rgba, width, height } = frame
    if (transparent) {
      // oneBitAlpha:alpha 阈值以下的像素在调色板里归到透明项
      for (let i = 3; i < rgba.length; i += 4) {
        rgba[i] = rgba[i] < 128 ? 0 : 255
      }
    }
    const palette = quantize(rgba, 256, { format, oneBitAlpha: transparent })
    const index = applyPalette(rgba, palette, format)
    gif.writeFrame(index, width, height, {
      palette,
      delay: frame.delay ?? 300,
      transparent,
    })
  }

  gif.finish()
  return new Blob([gif.bytes()], { type: 'image/gif' })
}

/** 把图像按 cover 方式绘制到统一尺寸的画布并取像素(帧统一尺寸的公共逻辑) */
export function drawFrame(img, size, background) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (background) {
    ctx.fillStyle = background
    ctx.fillRect(0, 0, size, size)
  }
  const ratio = Math.max(size / img.naturalWidth, size / img.naturalHeight)
  const w = img.naturalWidth * ratio
  const h = img.naturalHeight * ratio
  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
  const imageData = ctx.getImageData(0, 0, size, size)
  // gifenc 严格校验 Uint8Array;getImageData.data 是 Uint8ClampedArray,需转换
  return { rgba: new Uint8Array(imageData.data), width: size, height: size }
}