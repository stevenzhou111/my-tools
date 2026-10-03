<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'

const text = ref(`你好!欢迎使用我的工具箱,这是一段由浏览器本地语音合成的朗读测试。`)
const voiceURI = ref('')
const rate = ref(1)
const pitch = ref(1)
const speaking = ref(false)
const paused = ref(false)
const voices = ref([])
const error = ref('')

const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

function loadVoices() {
  if (!supported) return
  const list = speechSynthesis.getVoices()
  if (list.length) {
    voices.value = list
    if (!voiceURI.value) {
      const zh = list.find((v) => /zh|cmn|Chinese/i.test(v.lang))
      voiceURI.value = (zh || list[0]).voiceURI
    }
  }
}

onMounted(() => {
  if (!supported) {
    error.value = '当前浏览器不支持语音合成(Web Speech API)'
    return
  }
  loadVoices()
  speechSynthesis.addEventListener('voiceschanged', loadVoices)
})

onUnmounted(() => {
  if (supported) {
    speechSynthesis.removeEventListener('voiceschanged', loadVoices)
    speechSynthesis.cancel()
  }
})

const zhVoices = computed(() => voices.value.filter((v) => /zh|cmn|Chinese/i.test(v.lang)))
const otherVoices = computed(() => voices.value.filter((v) => !/zh|cmn|Chinese/i.test(v.lang)))

function speak() {
  if (!supported) return
  error.value = ''
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text.value)
  const voice = voices.value.find((v) => v.voiceURI === voiceURI.value)
  if (voice) u.voice = voice
  u.rate = rate.value
  u.pitch = pitch.value
  u.onend = () => {
    speaking.value = false
    paused.value = false
  }
  u.onerror = () => {
    speaking.value = false
  }
  speaking.value = true
  paused.value = false
  speechSynthesis.speak(u)
}

function pauseResume() {
  if (!speaking.value) return
  if (paused.value) {
    speechSynthesis.resume()
    paused.value = false
  } else {
    speechSynthesis.pause()
    paused.value = true
  }
}

function stop() {
  if (!supported) return
  speechSynthesis.cancel()
  speaking.value = false
  paused.value = false
}
</script>

<template>
  <div v-if="error" class="error-box" style="margin-bottom: 12px">✗ {{ error }}</div>

  <div class="field">
    <label class="field-label">要朗读的文本</label>
    <textarea v-model="text" class="textarea" rows="5" spellcheck="false"></textarea>
  </div>

  <div class="row" style="margin-bottom: 14px">
    <label class="ctrl" style="flex: 1; min-width: 220px">
      <span class="field-label">音色(共 {{ voices.length }} 个,优先中文)</span>
      <select v-model="voiceURI" class="select">
        <optgroup v-if="zhVoices.length" label="中文语音">
          <option v-for="v in zhVoices" :key="v.voiceURI" :value="v.voiceURI">{{ v.name }}({{ v.lang }})</option>
        </optgroup>
        <optgroup v-if="otherVoices.length" label="其他语音">
          <option v-for="v in otherVoices" :key="v.voiceURI" :value="v.voiceURI">{{ v.name }}({{ v.lang }})</option>
        </optgroup>
      </select>
    </label>
    <label class="ctrl">
      <span class="field-label">语速 {{ rate.toFixed(1) }}x</span>
      <input v-model.number="rate" type="range" min="0.5" max="2" step="0.1" />
    </label>
    <label class="ctrl">
      <span class="field-label">音调 {{ pitch.toFixed(1) }}</span>
      <input v-model.number="pitch" type="range" min="0.5" max="2" step="0.1" />
    </label>
  </div>

  <div class="row">
    <button class="btn btn-primary" :disabled="!text.trim()" @click="speak">▶ 播放</button>
    <button class="btn" :disabled="!speaking" @click="pauseResume">{{ paused ? '▶ 继续' : '⏸ 暂停' }}</button>
    <button class="btn" :disabled="!speaking" @click="stop">⏹ 停止</button>
  </div>

  <p class="tip" style="margin-top: 12px">
    语音由操作系统内置的合成引擎在本地生成(浏览器 Web Speech API),不会上传;音色数量取决于系统安装的语言包。
  </p>
</template>

<style scoped>
.ctrl {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 160px;
}
</style>
