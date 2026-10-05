<script setup>
import { computed, ref, watch } from 'vue'
import { BASE_ALGOS } from '@/utils/baseEnc'
import { useCopy } from '@/utils/useCopy'

const mode = ref('encode') // encode | decode
const algo = ref('base32')
const input = ref('')
const output = ref('')
const error = ref('')

const { copiedKey, copy } = useCopy()

function convert() {
  error.value = ''
  output.value = ''
  const src = input.value
  if (!src.trim()) return
  const { encode, decode } = BASE_ALGOS[algo.value]
  try {
    output.value = mode.value === 'encode' ? encode(src) : decode(src)
  } catch (e) {
    error.value = e.message
  }
}

watch([input, mode, algo], convert)

function swap() {
  if (!output.value) return
  input.value = output.value
  mode.value = mode.value === 'encode' ? 'decode' : 'encode'
}

const placeholder = computed(() =>
  mode.value === 'encode' ? '输入要编码的文本(支持中文)…' : `粘贴 ${BASE_ALGOS[algo.value].name.split('(')[0].trim()} 编码串…`,
)
</script>

<template>
  <div class="row" style="margin-bottom: 16px" role="tablist">
    <button class="btn" :class="{ 'btn-primary': mode === 'encode' }" role="tab" :aria-selected="mode === 'encode'" @click="mode = 'encode'">
      文本 → 编码
    </button>
    <button class="btn" :class="{ 'btn-primary': mode === 'decode' }" role="tab" :aria-selected="mode === 'decode'" @click="mode = 'decode'">
      编码 → 文本
    </button>
  </div>

  <div class="field">
    <span class="field-label">编码方案</span>
    <div class="row" role="radiogroup" aria-label="编码方案">
      <button
        v-for="(a, key) in BASE_ALGOS"
        :key="key"
        class="btn btn-sm"
        :class="{ 'btn-primary': algo === key }"
        role="radio"
        :aria-checked="algo === key"
        @click="algo = key"
      >
        {{ a.name }}
      </button>
    </div>
    <p class="tip" style="margin-top: 6px">
      <template v-if="algo === 'base32'">RFC 4648 标准,常用于TOTP 密钥、配置文件;字母表 A-Z 2-7,不区分大小写。</template>
      <template v-else-if="algo === 'base58'">Bitcoin 字母表,去掉易混淆的 0 O I l,地址与 IPFS CID 常用。</template>
      <template v-else>0-9 A-Z a-z,URL 最短最友好,短链与邀请码常用。</template>
      全部按 UTF-8 字节处理,中文不乱码。
    </p>
  </div>

  <div class="field">
    <label class="field-label" for="base-in">{{ mode === 'encode' ? '原文' : '编码串' }}</label>
    <textarea id="base-in" v-model="input" v-draft="'base-enc-input'" class="textarea" style="min-height: 110px" :placeholder="placeholder" spellcheck="false"></textarea>
  </div>

  <div v-if="error" class="error-box" style="margin-bottom: 14px">✗ {{ error }}</div>

  <div class="field">
    <label class="field-label" for="base-out">{{ mode === 'encode' ? '编码结果' : '解码结果' }}</label>
    <textarea id="base-out" class="textarea" style="min-height: 110px" readonly :value="output" placeholder="结果实时生成…"></textarea>
    <div class="row" style="margin-top: 10px">
      <button class="btn btn-sm btn-primary" :disabled="!output" @click="copy('base', output)">
        {{ copiedKey === 'base' ? '✓ 已复制' : '复制结果' }}
      </button>
      <button class="btn btn-sm" :disabled="!output" @click="swap">⇄ 用结果反向继续</button>
    </div>
  </div>
</template>
