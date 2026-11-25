<script setup>
import AppIcon from '@/components/AppIcon.vue'
import CopyButton from '@/components/CopyButton.vue'
import { computed, ref } from 'vue'
import { downloadBlob } from '@/utils/image'
import { useUrlState } from '@/utils/urlState'
import { ZH_MODES, convertZh } from '@/utils/zhConvert'

const SAMPLE = '这个软件的网络功能很好用,我们计划在下个版本的计算机客户端里继续优化,欢迎反馈。'

const MODE_NOTES = {
  s2t: '台湾标准字形,只做字形转换(软件 → 軟件)',
  s2twp: '在字形基础上做台湾常用词替换(软件 → 軟體、网络 → 網路)',
  s2hk: '香港标准字形与用词(软件 → 軟件、网络 → 網絡)',
  t2s: '把台湾繁体连同台湾用词一起转回简体',
  hk2s: '把香港繁体与用词转回简体',
}

const input = ref('')
const mode = ref('s2t')

useUrlState([
  { key: 'm', ref: mode, parse: (s) => (ZH_MODES.some((m) => m.id === s) ? s : undefined) },
])

const result = computed(() => convertZh(input.value, mode.value))
const note = computed(() => MODE_NOTES[mode.value] || '')

function fillSample() {
  input.value = SAMPLE
}

function swap() {
  if (result.value.text) input.value = result.value.text
  mode.value = { s2t: 't2s', s2twp: 't2s', s2hk: 'hk2s', t2s: 's2t', hk2s: 's2hk' }[mode.value] || 's2t'
}

function download() {
  if (!result.value.text) return
  downloadBlob(new Blob([result.value.text], { type: 'text/plain;charset=utf-8' }), `zh-${mode.value}.txt`)
}
</script>

<template>
  <p class="tip mb-14">
    基于 OpenCC 词典做简繁转换,支持台湾 / 香港字形与用词。转换在浏览器本地完成,文本不上传、不写入草稿。
  </p>

  <div class="row row-wrap mb-14">
    <div class="field grow">
      <label class="field-label" for="zh-mode">转换方向</label>
      <select id="zh-mode" v-model="mode" class="select">
        <option v-for="m in ZH_MODES" :key="m.id" :value="m.id">{{ m.label }}</option>
      </select>
    </div>
    <button class="btn" @click="swap"><AppIcon name="arrow-left-right" :size="15" /> 反向并继续</button>
    <button class="btn" @click="fillSample">示例</button>
    <button class="btn" @click="input = ''">清空</button>
  </div>
  <p class="tip mb-14">{{ note }}</p>

  <div class="grid-2">
    <div class="field">
      <label class="field-label" for="zh-input">原文({{ input.length }} 字符)</label>
      <textarea
        id="zh-input"
        v-model="input"
        class="textarea"
        rows="12"
        spellcheck="false"
        placeholder="输入或粘贴要转换的中文…"
      ></textarea>
    </div>
    <div class="field">
      <label class="field-label">结果({{ result.text.length }} 字符)</label>
      <div v-if="result.error" class="error-box">✗ {{ result.error }}</div>
      <template v-else>
        <textarea class="textarea" rows="12" readonly :value="result.text" placeholder="转换结果会实时出现在这里"></textarea>
        <div class="row mt-10">
          <CopyButton class="btn btn-sm btn-primary" :text="result.text" label="复制结果" />
          <button class="btn btn-sm" :disabled="!result.text" @click="download">
            <AppIcon name="download" :size="15" /> 下载 .txt
          </button>
        </div>
      </template>
    </div>
  </div>

  <p class="tip mt-12">
    只做字形 / 用词映射,不改动专有名词与文言文;古文、人名地名等存在多对一情况,重要文本请人工复核。
  </p>
</template>