/**
 * AudioBuffer → 16bit PCM WAV 打包。
 * 从「音频剪辑」与「视频提取音频」共用的编码器,浏览器原生 RIFF 写入,无依赖。
 *
 * @param {AudioBuffer} audioBuffer
 * @returns {Blob} audio/wav
 */
export function encodeWav(audioBuffer) {
  const channels = audioBuffer.numberOfChannels
  const sr = audioBuffer.sampleRate
  const frames = audioBuffer.length
  const bytes = 44 + frames * channels * 2
  const view = new DataView(new ArrayBuffer(bytes))
  const writeStr = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }
  writeStr(0, 'RIFF')
  view.setUint32(4, bytes - 8, true)
  writeStr(8, 'WAVEfmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, channels, true)
  view.setUint32(24, sr, true)
  view.setUint32(28, sr * channels * 2, true)
  view.setUint16(32, channels * 2, true)
  view.setUint16(34, 16, true)
  writeStr(36, 'data')
  view.setUint32(40, frames * channels * 2, true)
  let offset = 44
  const chData = []
  for (let ch = 0; ch < channels; ch++) chData.push(audioBuffer.getChannelData(ch))
  for (let i = 0; i < frames; i++) {
    for (let ch = 0; ch < channels; ch++) {
      const v = Math.max(-1, Math.min(1, chData[ch][i]))
      view.setInt16(offset, v < 0 ? v * 0x8000 : v * 0x7fff, true)
      offset += 2
    }
  }
  return new Blob([view], { type: 'audio/wav' })
}
