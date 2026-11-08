<script setup>
import { computed, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import CopyButton from '@/components/CopyButton.vue'
import { downloadBlob } from '@/utils/image'
import { parseSubtitles, toSrt, toVtt, shiftCues, scaleCues, totalDuration } from '@/utils/srt'

/**
 * 字幕互转:SRT ↔ WebVTT 自动识别,附时间轴平移与帧率缩放。
 * 全部本地计算,纯文本处理。
 */

const input = ref('')
const error = ref('')
const outFormat = ref('vtt')
const shiftSec = ref(0)
const scale = ref(1)

const parsed = computed(() => {
  error.value = ''
  if (!input.value.trim()) return null
  try {
    return parseSubtitles(input.value)
  } catch (e) {
    error.value = e.message
    return null
  }
})

const transformed = computed(() => {
  if (!parsed.value) return null
  let cues = parsed.value.cues
  const shift = Number(shiftSec.value) || 0
  if (shift) cues = shiftCues(cues, Math.round(shift * 1000))
  const factor = Number(scale.value)
  if (Number.isFinite(factor) && factor !== 1) {
    try { cues = scaleCues(cues, factor) } catch (e) { error.value = e.message; return null }
  }
  return cues
})

const output = computed(() => {
  if (!transformed.value) return ''
  return outFormat.value === 'srt' ? toSrt(transformed.value) : toVtt(transformed.value)
})

// 未做时间轴变换时,保持与输入相同的格式输出,降低「转了个寂寞」的困惑
const effectiveFormat = computed(() => {
  const shift = Number(shiftSec.value) || 0
  const factor = Number(scale.value)
  return shift === 0 && (!Number.isFinite(factor) || factor === 1) ? parsed.value?.format : outFormat.value
})

const stats = computed(() => {
  if (!transformed.value) return ''
  return `${transformed.value.length} 条字幕 · 总时长 ${formatDuration(totalDuration(transformed.value))}`
})

function formatDuration(ms) {
  const s = Math.round(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h ? `${h} 小时 ${m} 分` : m ? `${m} 分 ${s % 60} 秒` : `${s} 秒`
}

function download() {
  const ext = effectiveFormat.value === 'srt' ? 'srt' : 'vtt'
  const type = ext === 'srt' ? 'application/x-subrip' : 'text/vtt'
  downloadBlob(new Blob(['\uFEFF' + output.value], { type: `${type};charset=utf-8` }), `subtitle.${ext}`)
}

const isSwitched = computed(() => parsed.value && effectiveFormat.value !== parsed.value.format)
</script>

<template>
  <div class="field">
    <label class="field-label" for="srt-in">粘贴字幕(SRT 或 VTT,自动识别)</label>
    <textarea
      id="srt-in"
      v-model="input"
      class="textarea"
      style="min-height: 180px"
      spellcheck="false"
      placeholder="1&#10;00:00:01,000 --> 00:00:03,500&#10;第一句"
    ></textarea>
  </div>

  <div v-if="error" class="error-box mb-14">✗ {{ error }}</div>

  <template v-if="transformed">
    <div class="row mb-14 ctrl-row">
      <label class="ctrl">
        <span class="field-label">输出格式</span>
        <select v-model="outFormat" class="select">
          <option value="srt">SRT</option>
          <option value="vtt">WebVTT</option>
        </select>
      </label>
      <label class="ctrl">
        <span class="field-label">平移(秒,可负)</span>
        <input v-model.number="shiftSec" class="input" type="number" step="0.1" style="width: 110px" />
      </label>
      <label class="ctrl">
        <span class="field-label">缩放系数(帧率修正)</span>
        <input v-model.number="scale" class="input" type="number" step="0.001" min="0" style="width: 110px" />
      </label>
      <span class="tip">{{ stats }}</span>
    </div>
    <p v-if="isSwitched" class="tip m-0 mb-14">
      已从 {{ parsed.format.toUpperCase() }} 转换为 {{ effectiveFormat.toUpperCase() }};若仅平移/缩放,输出格式与输入一致。
    </p>

    <label class="field-label" for="srt-out">结果</label>
    <textarea id="srt-out" class="textarea" style="min-height: 180px" readonly :value="output"></textarea>
    <div class="row mt-10">
      <CopyButton class="btn btn-sm" :text="output" />
      <button class="btn btn-sm" @click="download"><AppIcon name="download" :size="14" />下载 .{{ effectiveFormat }}</button>
    </div>

    <p class="tip mt-12">
      平移用于整体提前/延后;缩放用于帧率修正(如 25fps 字幕用于 23.976fps 视频填 25/23.976 ≈ 1.0427)。负平移会把起点截断到 0。
    </p>
  </template>
</template>

<style scoped>
.ctrl-row {
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 14px;
}
</style>
