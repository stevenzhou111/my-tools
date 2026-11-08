<script setup>
import { computed, ref } from 'vue'
import CopyButton from '@/components/CopyButton.vue'
import { toPinyin, PINYIN_MODES } from '@/utils/pinyinTool'

/**
 * 文本转拼音:复用 pinyin-pro(与站内搜索词典同源),多音字按词组语境识别。
 * 全部本地计算。
 */

const input = ref('')
const mode = ref('tone')

const output = computed(() => toPinyin(input.value, mode.value))
</script>

<template>
  <div class="field">
    <label class="field-label" for="py-in">输入中文(支持中英混排,英文原样保留)</label>
    <textarea id="py-in" v-model="input" class="textarea" rows="4" placeholder="如:重庆的长江大桥"></textarea>
  </div>

  <div class="row mb-14">
    <label v-for="m in PINYIN_MODES" :key="m.id" class="check">
      <input v-model="mode" type="radio" :value="m.id" />{{ m.label }}
    </label>
  </div>

  <template v-if="input.trim()">
    <label class="field-label" for="py-out">结果</label>
    <textarea id="py-out" class="textarea" rows="4" readonly :value="output"></textarea>
    <div class="row mt-10">
      <CopyButton class="btn btn-sm" :text="output" />
    </div>
    <p class="tip mt-12">多音字按词组语境识别(重庆 chóng、长城 cháng);姓名单字可能需要人工复核,如「曾」作姓读 zēng。</p>
  </template>
</template>
