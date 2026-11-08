<script setup>
import { computed, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import CopyButton from '@/components/CopyButton.vue'
import { buildUtmUrl, UTM_FIELDS } from '@/utils/utm'

/**
 * UTM 链接生成:渠道归因参数拼接。保留原链接的查询参数与 hash,
 * 自动清除旧 utm_* 防止叠加。纯字符串处理,本地完成。
 */

const url = ref('')
const params = ref({ utm_source: '', utm_medium: '', utm_campaign: '', utm_term: '', utm_content: '' })
const error = ref('')

const MEDIUM_CHIPS = ['cpc', 'banner', 'email', 'social', 'newsletter', 'referral']

const result = computed(() => {
  error.value = ''
  if (!url.value.trim()) return ''
  try {
    return buildUtmUrl(url.value, params.value)
  } catch (e) {
    error.value = e.message
    return ''
  }
})

const filledCount = computed(() => UTM_FIELDS.filter((f) => params.value[f.key].trim()).length)

function setMedium(m) {
  params.value = { ...params.value, utm_medium: m }
}
</script>

<template>
  <div class="field">
    <label class="field-label" for="utm-url">目标链接(http/https)</label>
    <input id="utm-url" v-model="url" class="input" spellcheck="false" placeholder="https://example.com/landing?a=1" />
  </div>

  <div class="field">
    <span class="field-label">归因参数(带 * 的建议必填)</span>
    <div class="utm-grid">
      <label v-for="f in UTM_FIELDS" :key="f.key" class="ctrl">
        <span class="field-label">{{ f.label }}{{ f.key === 'utm_source' || f.key === 'utm_medium' ? ' *' : '' }}</span>
        <input v-model="params[f.key]" class="input" :placeholder="f.placeholder" spellcheck="false" />
      </label>
    </div>
    <div class="row mt-10">
      <span class="tip">常用 medium:</span>
      <button v-for="m in MEDIUM_CHIPS" :key="m" type="button" class="btn btn-sm chip" :class="{ active: params.utm_medium === m }" @click="setMedium(m)">{{ m }}</button>
    </div>
  </div>

  <div v-if="error" class="error-box mb-14">✗ {{ error }}</div>

  <template v-if="result">
    <label class="field-label" for="utm-out">带 UTM 的链接({{ filledCount }} 个参数)</label>
    <textarea id="utm-out" class="textarea" rows="3" readonly :value="result"></textarea>
    <div class="row mt-10">
      <CopyButton class="btn btn-sm btn-primary" :text="result" label="复制链接" />
      <a :href="result" target="_blank" rel="noopener noreferrer" class="btn btn-sm">
        <AppIcon name="arrow-up-right" :size="14" />打开验证
      </a>
    </div>
    <p class="tip mt-12">原链接的其它参数与 #hash 会保留;重复生成时旧的 utm_* 会被清掉再填,不会叠加。</p>
  </template>
</template>

<style scoped>
.utm-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}
.chip.active {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-soft);
}
</style>
