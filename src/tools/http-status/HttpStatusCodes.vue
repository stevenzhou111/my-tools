<script setup>
import { computed, ref } from 'vue'
import { useCopy } from '@/utils/useCopy'

const query = ref('')
const { copiedKey, copy } = useCopy()

const CODES = [
  { code: 100, name: 'Continue', zh: '继续', desc: '客户端应继续发送请求主体' },
  { code: 101, name: 'Switching Protocols', zh: '切换协议', desc: '服务器同意切换协议(如升级 WebSocket)' },
  { code: 200, name: 'OK', zh: '成功', desc: '请求成功,响应体包含预期内容' },
  { code: 201, name: 'Created', zh: '已创建', desc: '资源创建成功,常用于 POST/PUT' },
  { code: 202, name: 'Accepted', zh: '已接受', desc: '请求已受理,但尚未处理完成(异步任务)' },
  { code: 204, name: 'No Content', zh: '无内容', desc: '成功但无返回体,常用于 DELETE' },
  { code: 206, name: 'Partial Content', zh: '部分内容', desc: 'Range 请求成功,返回部分资源' },
  { code: 301, name: 'Moved Permanently', zh: '永久重定向', desc: '资源已永久迁移,搜索引擎会更新索引' },
  { code: 302, name: 'Found', zh: '临时重定向', desc: '资源临时位于其他 URI' },
  { code: 304, name: 'Not Modified', zh: '未修改', desc: '缓存仍有效,使用本地缓存即可' },
  { code: 307, name: 'Temporary Redirect', zh: '临时重定向(保持方法)', desc: '与 302 类似,但不允许更改请求方法' },
  { code: 308, name: 'Permanent Redirect', zh: '永久重定向(保持方法)', desc: '与 301 类似,但不允许更改请求方法' },
  { code: 400, name: 'Bad Request', zh: '错误请求', desc: '请求参数或格式不合法' },
  { code: 401, name: 'Unauthorized', zh: '未认证', desc: '未登录或凭证无效' },
  { code: 403, name: 'Forbidden', zh: '禁止访问', desc: '已认证但无权限' },
  { code: 404, name: 'Not Found', zh: '未找到', desc: '请求的资源不存在' },
  { code: 405, name: 'Method Not Allowed', zh: '方法不允许', desc: 'HTTP 方法不被该资源支持' },
  { code: 408, name: 'Request Timeout', zh: '请求超时', desc: '客户端发送请求超时' },
  { code: 409, name: 'Conflict', zh: '冲突', desc: '请求与资源当前状态冲突' },
  { code: 413, name: 'Payload Too Large', zh: '请求体过大', desc: '请求内容超过服务器限制' },
  { code: 415, name: 'Unsupported Media Type', zh: '不支持的媒体类型', desc: 'Content-Type 不被支持' },
  { code: 422, name: 'Unprocessable Entity', zh: '无法处理的实体', desc: '格式正确但语义校验失败' },
  { code: 429, name: 'Too Many Requests', zh: '请求过于频繁', desc: '触发了限流,稍后重试' },
  { code: 451, name: 'Unavailable For Legal Reasons', zh: '因法律原因不可用', desc: '资源因法律要求被屏蔽' },
  { code: 500, name: 'Internal Server Error', zh: '服务器内部错误', desc: '服务端代码异常' },
  { code: 501, name: 'Not Implemented', zh: '未实现', desc: '服务器不支持该请求功能' },
  { code: 502, name: 'Bad Gateway', zh: '网关错误', desc: '上游服务返回无效响应' },
  { code: 503, name: 'Service Unavailable', zh: '服务不可用', desc: '服务器过载或维护中' },
  { code: 504, name: 'Gateway Timeout', zh: '网关超时', desc: '上游服务响应超时' },
]

function cls(code) {
  if (code < 200) return 'g1'
  if (code < 300) return 'g2'
  if (code < 400) return 'g3'
  if (code < 500) return 'g4'
  return 'g5'
}

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return CODES
  return CODES.filter((c) => `${c.code} ${c.name} ${c.zh} ${c.desc}`.toLowerCase().includes(q))
})
</script>

<template>
  <div class="field">
    <label class="field-label">搜索状态码或关键字</label>
    <input v-model="query" class="input" placeholder="如 404、重定向、timeout" spellcheck="false" />
  </div>

  <div class="status-grid">
    <div v-for="c in filtered" :key="c.code" class="panel status-card">
      <div class="status-head">
        <span class="status-code" :class="cls(c.code)">{{ c.code }}</span>
        <strong>{{ c.zh }}</strong>
        <button class="btn btn-sm" @click="copy(String(c.code), String(c.code))">
          {{ copiedKey === String(c.code) ? '✓' : '复制' }}
        </button>
      </div>
      <div class="status-name">{{ c.code }} {{ c.name }}</div>
      <p class="status-desc">{{ c.desc }}</p>
    </div>
  </div>
</template>

<style scoped>
.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}
.status-card {
  padding: 14px;
}
.status-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 4px;
}
.status-code {
  font-family: var(--mono);
  font-weight: 700;
  font-size: 17px;
  padding: 1px 9px;
  border-radius: 7px;
  color: #fff;
}
.g1 { background: #06b6d4; }
.g2 { background: #10b981; }
.g3 { background: #f59e0b; }
.g4 { background: #f97316; }
.g5 { background: #ef4444; }
.status-name {
  font-family: var(--mono);
  font-size: 13px;
  color: var(--muted);
  margin-bottom: 4px;
}
.status-desc {
  font-size: 14px;
  margin: 0;
}
</style>
