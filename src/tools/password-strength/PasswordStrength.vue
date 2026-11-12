<script setup>
import { computed, ref } from 'vue'
import CopyButton from '@/components/CopyButton.vue'
import { analyzePassword } from '@/utils/passwordStrength'

/**
 * 密码强度检测:zxcvbn-ts 浏览器本地词典推理(与站点泄露库同源思路),
 * 输入不上传、无网络请求。给两类场景:注册前自检、安全教学演示。
 */

const password = ref('')
const visible = ref(false)
const context = ref('')

// 用户名/站点等个人上下文加入候选词典:密码包含这些词会直接降分
const extra = computed(() => context.value.split(/[\s,，]+/).filter(Boolean))

const result = computed(() => analyzePassword(password.value, extra.value))
</script>

<template>
  <div class="panel mb-16">
    <div class="row ctrl-row">
      <label class="ctrl grow">
        <span class="field-label">输入密码(只在本页计算,不上传)</span>
        <input
          v-model="password"
          class="input"
          :type="visible ? 'text' : 'password'"
          spellcheck="false"
          autocomplete="off"
          placeholder="输入要检测的密码"
        />
      </label>
      <label class="check" style="align-self: flex-end"><input v-model="visible" type="checkbox" />显示明文</label>
    </div>

    <div class="field mt-10">
      <label class="field-label" for="ps-context">个人上下文词(可选:用户名/站点名/生日,逗号分隔)</label>
      <input id="ps-context" v-model="context" class="input" spellcheck="false" placeholder="如:zhangsan, myshop" />
    </div>

    <div v-if="result" class="mt-14">
      <div class="meter" role="img" :aria-label="`强度:${result.label}`">
        <span v-for="i in 5" :key="i" class="seg" :class="{ on: i <= result.score + 1, [`lv${result.score}`]: true }"></span>
        <b class="label">{{ result.label }}</b>
      </div>

      <table class="info-table mt-14">
        <tbody>
          <tr>
            <th>快哈希口径</th>
            <td>网站把密码明文/MD5 存库被拖库后,GPU 集群暴力破解:<b>{{ result.fastText }}</b></td>
          </tr>
          <tr>
            <th>慢哈希口径</th>
            <td>网站正确使用 bcrypt/argon2 时,单机 GPU 离线破解:<b>{{ result.slowText }}</b></td>
          </tr>
        </tbody>
      </table>

      <p v-if="result.warning" class="warn mt-14">⚠ {{ result.warning }}</p>
      <ul v-if="result.suggestions.length" class="sugg">
        <li v-for="s in result.suggestions" :key="s">{{ s }}</li>
      </ul>
    </div>

    <p class="tip m-0 mt-14">
      评分与破解时间是估算(按 1e10 次/秒的 GPU 集群与 bcrypt 类慢哈希两档),用于直观理解强弱,不代表任何真实站点的实际安全性。
    </p>
  </div>
</template>

<style scoped>
.ctrl-row {
  align-items: flex-end;
}
.meter {
  display: flex;
  align-items: center;
  gap: 6px;
}
.seg {
  flex: 1;
  height: 10px;
  border-radius: 5px;
  background: var(--border);
  transition: background 0.2s;
}
.seg.on.lv0 { background: #dc2626; }
.seg.on.lv1 { background: #f97316; }
.seg.on.lv2 { background: #eab308; }
.seg.on.lv3 { background: #22c55e; }
.seg.on.lv4 { background: #16a34a; }
.label { margin-left: 10px; }
.info-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.info-table th {
  text-align: left;
  color: var(--muted);
  font-weight: 500;
  padding: 6px 12px 6px 0;
  white-space: nowrap;
  width: 30%;
}
.warn {
  color: var(--danger, #dc2626);
  font-weight: 600;
}
.sugg {
  margin: 8px 0 0;
  padding-left: 20px;
  color: var(--text);
  line-height: 1.8;
}
</style>
