/**
 * 多段音频拼接:声道归一、间隙、接缝淡入淡出。
 * 只处理 Float32 声道数据,解码与 WAV 打包分别由 AudioContext / utils/wav 负责。
 */

const MAX_CHANNELS = 2

function channelCount(tracks) {
  return Math.min(MAX_CHANNELS, Math.max(...tracks.map((t) => t.channels.length), 1))
}

export function trackChannels(buffer) {
  const n = buffer.numberOfChannels
  if (!n) throw new Error('音频没有可用声道')
  return Array.from({ length: n }, (_, i) => buffer.getChannelData(i))
}

/** 不同声道数的音频统一成单声道或立体声(单声道复制到两个声道,多声道只取前两路) */
export function normalizeTracks(tracks) {
  if (!tracks.length) throw new Error('至少需要一个音频文件')
  const target = channelCount(tracks)
  return tracks.map((t) => ({
    ...t,
    channels: Array.from({ length: target }, (_, ch) => {
      const src = t.channels[Math.min(ch, t.channels.length - 1)]
      return src instanceof Float32Array ? src : Float32Array.from(src)
    }),
  }))
}

export function mergeTracks(tracks, { sampleRate, gapSeconds = 0, fadeSeconds = 0.01 } = {}) {
  if (!tracks.length) throw new Error('至少需要一个音频文件')
  if (tracks.some((t) => t.sampleRate !== sampleRate)) {
    throw new Error('音频采样率不一致,无法直接拼接')
  }
  const normalized = normalizeTracks(tracks)
  const channels = Math.min(MAX_CHANNELS, Math.max(...normalized.map((t) => t.channels.length)))
  const gapFrames = Math.max(0, Math.round((Number(gapSeconds) || 0) * sampleRate))
  const fadeFrames = Math.max(0, Math.round((Number(fadeSeconds) || 0) * sampleRate))
  const total = normalized.reduce((sum, t) => sum + t.channels[0].length, 0) + gapFrames * (normalized.length - 1)

  const out = Array.from({ length: channels }, () => new Float32Array(total))
  let offset = 0
  for (const track of normalized) {
    const len = track.channels[0].length
    const fade = Math.min(fadeFrames, Math.floor(len / 2))
    for (let ch = 0; ch < channels; ch++) {
      const src = track.channels[ch]
      const dst = out[ch]
      for (let i = 0; i < len; i++) {
        let gain = 1
        if (fade > 0) {
          if (i < fade) gain = i / fade
          else if (i >= len - fade) gain = (len - 1 - i) / fade
        }
        dst[offset + i] = src[i] * gain
      }
    }
    offset += len + gapFrames
  }

  return {
    numberOfChannels: channels,
    length: total,
    sampleRate,
    getChannelData: (ch) => out[ch],
  }
}

export function mergeDuration(buffer) {
  return buffer.length / buffer.sampleRate
}