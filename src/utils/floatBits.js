/**
 * IEEE 754 浮点数位型解剖:展示一个数在 64 位(double)与 32 位(float)
 * 下的符号 / 指数 / 尾数位,理解 0.1+0.2 !== 0.3 之类的精度问题。
 * 位型由 DataView 写入后按字节读出,与平台无关。
 */

function bitsFromBytes(bytes) {
  let hex = ''
  let bits = ''
  for (const b of bytes) {
    hex += b.toString(16).padStart(2, '0')
    bits += b.toString(2).padStart(8, '0')
  }
  return { hex, bits }
}

function classify(expBits, fracBits) {
  const allExp = /^1+$/.test(expBits)
  const noFrac = /^0+$/.test(fracBits)
  if (allExp) return noFrac ? 'infinity' : 'nan'
  if (/^0+$/.test(expBits)) return noFrac ? 'zero' : 'subnormal'
  return 'normal'
}

/** 64 位双精度解剖 */
export function float64Bits(n) {
  const buf = new ArrayBuffer(8)
  const view = new DataView(buf)
  view.setFloat64(0, Number(n))
  const bytes = [...new Uint8Array(buf)]
  const { hex, bits } = bitsFromBytes(bytes)
  const signBit = bits[0]
  const expBits = bits.slice(1, 12)
  const fracBits = bits.slice(12)
  return {
    hex,
    signBit,
    expBits,
    fracBits,
    sign: signBit === '1' ? -1 : 1,
    exponent: parseInt(expBits, 2) - 1023,
    kind: classify(expBits, fracBits),
  }
}

/** 32 位单精度解剖(值会先舍入到 float 精度) */
export function float32Bits(n) {
  const buf = new ArrayBuffer(4)
  const view = new DataView(buf)
  view.setFloat32(0, Number(n))
  const bytes = [...new Uint8Array(buf)]
  const { hex, bits } = bitsFromBytes(bytes)
  const signBit = bits[0]
  const expBits = bits.slice(1, 9)
  const fracBits = bits.slice(9)
  return {
    hex,
    signBit,
    expBits,
    fracBits,
    sign: signBit === '1' ? -1 : 1,
    exponent: parseInt(expBits, 2) - 127,
    kind: classify(expBits, fracBits),
    value: view.getFloat32(0),
  }
}
