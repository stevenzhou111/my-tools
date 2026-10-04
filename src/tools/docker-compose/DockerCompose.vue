<script setup>
import { ref, watch } from 'vue'
import { dockerToCompose } from '@/utils/dockerCompose'
import { useCopy } from '@/utils/useCopy'

const input = ref(`docker run -d --name web \\
  -p 8080:80 \\
  -v /srv/website:/usr/share/nginx/html:ro \\
  -e NGINX_PORT=80 \\
  --restart unless-stopped \\
  nginx:latest`)
const { copiedKey, copy } = useCopy()

const result = ref({ yaml: '', warnings: [], error: '' })
watch(
  input,
  (v) => {
    result.value = dockerToCompose(v)
  },
  { immediate: true },
)

const SAMPLE = 'docker run -it --rm -v "$PWD":/app -w /app node:20 npx create-vite@latest my-app'
</script>

<template>
  <div class="field">
    <label class="field-label">docker run 命令</label>
    <textarea v-draft="'docker-compose-input'" v-model="input" class="textarea" rows="7" spellcheck="false" placeholder="粘贴 docker run …"></textarea>
    <div class="row" style="margin-top: 10px">
      <button class="btn btn-sm" @click="input = SAMPLE">复杂示例</button>
      <span class="tip">支持 -d/-it/-p/-v/-e/--name/--restart/--network/--privileged 等,未识别的旗标会在下方列出</span>
    </div>
  </div>

  <div v-if="result.error" class="error-box">✗ {{ result.error }}</div>

  <template v-else-if="result.yaml">
    <label class="field-label">docker-compose.yml</label>
    <pre class="output compose-output">{{ result.yaml }}</pre>
    <div v-if="result.warnings.length" class="warn-list panel">
      <p v-for="(w, i) in result.warnings" :key="i" style="margin: 2px 0">⚠️ {{ w }}</p>
    </div>
    <div class="row" style="margin-top: 10px">
      <button class="btn btn-sm btn-primary" @click="copy('compose', result.yaml)">
        {{ copiedKey === 'compose' ? '✓ 已复制' : '复制 YAML' }}
      </button>
    </div>
  </template>
</template>

<style scoped>
.compose-output {
  max-height: 46vh;
  overflow: auto;
}
.warn-list {
  margin-top: 10px;
  padding: 10px 14px;
  color: #b45309;
  font-size: 13.5px;
}
</style>