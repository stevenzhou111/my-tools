/**
 * 音频转 MP3:AudioContext 解码浏览器支持的格式(WAV/MP3/M4A/OGG/FLAC…),
 * lamejs(@breezystack fork,修复了 1.2.x 的 ESM 打包问题)重编码为 MP3。
 * 纯浏览器完成,文件不上传。
 */

/** 解码任意浏览器支持音频文件 → AudioBuffer */
export async function decodeAudio(file) {
  const bytes = await file.arrayBuffer()
  const Ctx = window.AudioContext || window.webkitAudioContext
  const ctx = new Ctx()
  try {
    return await ctx.decodeAudioData(bytes)
  } finally {
    ctx.close?.().catch?.(() => {})
  }
}

/** Float32 采样转 int16(lamejs 输入要求),限幅防溢出 */
function floatTo16(f32) {
  const out = new Int16Array(f32.length)
  for (let i = 0; i < f32.length; i++) {
    const s = Math.max(-1, Math.min(1, f32[i]))
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return out
}

/**
 * AudioBuffer → MP3 Blob。
 * @param {AudioBuffer|{numberOfChannels:number,sampleRate:number,getChannelData:Function}} audioBuffer
 * @param {{kbps?:number, onProgress?:(p:number)=>void}} opts
 */
export async function encodeMp3(audioBuffer, { kbps = 192, onProgress } = {}) {
  const { Mp3Encoder } = await import('@breezystack/lamejs')
  const channels = Math.min(2, audioBuffer.numberOfChannels)
  const encoder = new Mp3Encoder(channels, audioBuffer.sampleRate, kbps)
  const left = audioBuffer.getChannelData(0)
  const right = channels > 1 ? audioBuffer.getChannelData(1) : null

  // lamejs 按 1152 样本/帧处理,这里每次喂 11520 样本(约 1/4 秒 @44.1k)平衡进度粒度与开销
  const BLOCK = 1152 * 10
  const chunks = []
  for (let off = 0; off < left.length; off += BLOCK) {
    const l = floatTo16(left.subarray(off, off + BLOCK))
    const buf = channels > 1 ? encoder.encodeBuffer(l, floatTo16(right.subarray(off, off + BLOCK))) : encoder.encodeBuffer(l)
    if (buf.length) chunks.push(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength))
    onProgress?.(Math.min(1, (off + BLOCK) / left.length))
  }
  const tail = encoder.flush()
  if (tail.length) chunks.push(new Uint8Array(tail.buffer, tail.byteOffset, tail.byteLength))
  return new Blob(chunks, { type: 'audio/mpeg' })
}
