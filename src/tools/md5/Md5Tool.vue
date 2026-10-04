<script setup>
import { computed, ref, watch } from 'vue'
import SparkMD5 from 'spark-md5'
import { useCopy } from '@/utils/useCopy'

const input = ref('你好,工具箱!')
const upper = ref(false)
const short16 = ref(false)
const { copiedKey, copy } = useCopy()

// spark-md5 是流式 API(与文件哈希工具共用一个库):文本按 UTF-8 字节计算,
// 与 blueimp-md5 对字符串的编码方式一致;先存小写摘要,大写/16 位在展示层处理
const digest = ref('')
watch(
  input,
  (s) => {
    const spark = new SparkMD5()
    spark.append(new TextEncoder().encode(s))
    digest.value = spark.end()
  },
  { immediate: true },
)

const full = computed(() => (upper.value ? digest.value.toUpperCase() : digest.value))
const output = computed(() => (short16.value ? full.value.slice(8, 24) : full.value))
</script>

<template>
  <div class="field">
    <label class="field-label">输入文本</label>
    <textarea v-model="input" class="textarea" rows="4" spellcheck="false"></textarea>
  </div>

  <div class="row" style="margin-bottom: 14px">
    <label class="check"><input v-model="upper" type="checkbox" />大写输出</label>
    <label class="check"><input v-model="short16" type="checkbox" />16 位(取第 9~24 位)</label>
  </div>

  <label class="field-label">MD5 摘要</label>
  <pre class="output">{{ output }}</pre>
  <div class="row" style="margin-top: 10px">
    <button class="btn btn-sm" @click="copy('out', output)">
      {{ copiedKey === 'out' ? '✓ 已复制' : '复制结果' }}
    </button>
  </div>

  <p class="tip" style="margin-top: 12px">
    MD5 已不再具备密码学安全性,仅建议用于普通数据校验;需要安全摘要请使用「哈希计算」中的 SHA-256。
  </p>
</template>
