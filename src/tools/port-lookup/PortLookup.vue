<script setup>
import { computed, ref } from 'vue'
import { PORT_GROUPS, allPorts } from '@/utils/ports'
import { useUrlState } from '@/utils/urlState'
import AppIcon from '@/components/AppIcon.vue'

const query = ref('')

const ALL = allPorts()

// 数字输入直接比对端口,文本匹配服务名/说明
useUrlState([{ key: 'q', ref: query, parse: (s) => (s.length <= 40 ? s : undefined) }])

const groups = computed(() => {
  const q = query.value.trim().toLowerCase()
  const qNum = Number(q)
  return PORT_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((it) => {
      if (!q) return true
      return (
        it.port === qNum ||
        it.name.toLowerCase().includes(q) ||
        it.desc.includes(query.value.trim())
      )
    }),
  })).filter((g) => g.items.length)
})

const total = computed(() => groups.value.reduce((n, g) => n + g.items.length, 0))
</script>

<template>
  <div class="panel mb-16">
    <label class="search-wrap">
      <AppIcon name="search" :size="15" />
      <input v-model="query" class="input search-input" type="search" placeholder="搜 443 / redis / 邮件 / 代理…(端口号、服务名或用途)" />
    </label>
    <p class="tip m-0 mt-10">共 {{ total }} / {{ ALL.length }} 条;同端口不同服务(如 3000)会在对应分组各出现一次。</p>
  </div>

  <section v-for="g in groups" :key="g.id" class="port-group">
    <h2 class="group-title">{{ g.label }}<span class="tip"> · {{ g.items.length }}</span></h2>
    <div class="port-list">
      <div v-for="it in g.items" :key="`${it.port}-${it.name}`" class="port-item">
        <span class="port-num">{{ it.port }}</span>
        <span class="port-proto" :class="{ udp: it.proto.includes('UDP') }">{{ it.proto }}</span>
        <span class="port-name">{{ it.name }}</span>
        <span class="port-desc">{{ it.desc }}</span>
      </div>
    </div>
  </section>

  <div v-if="!total" class="panel empty">没有匹配的端口</div>

  <div class="panel mt-16">
    <p class="tip m-0">
      端口 0~1023 为知名端口(常需特权),1024~49151 注册端口,49152 起动态端口。
      端口通了只代表服务在监听,不代表可任意访问;对外暴露数据库与缓存端口是入侵重灾区,务必配合防火墙与白名单。
      完整登记表见 IANA Service Name and Transport Protocol Port Number Registry。
    </p>
  </div>
</template>

<style scoped>
.search-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--muted);
}
.search-input {
  flex: 1;
}
.port-group {
  margin-bottom: 20px;
}
.group-title {
  font-size: 15.5px;
  font-weight: 700;
  margin-bottom: 10px;
}
.port-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.port-item {
  display: grid;
  grid-template-columns: 64px 78px minmax(110px, 0.8fr) 2fr;
  gap: 12px;
  align-items: baseline;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 8px 14px;
}
@media (max-width: 720px) {
  .port-item {
    grid-template-columns: 56px 1fr;
    gap: 4px 10px;
  }
  .port-desc {
    grid-column: 1 / -1;
  }
}
.port-num {
  font-family: var(--mono);
  font-weight: 700;
  font-size: 15px;
  color: var(--accent);
}
.port-proto {
  font-size: 12px;
  border-radius: 999px;
  padding: 1px 8px;
  background: var(--accent-soft);
  color: var(--accent);
  text-align: center;
  justify-self: start;
}
.port-proto.udp {
  background: rgba(180, 83, 9, 0.12);
  color: var(--warning);
}
.port-name {
  font-weight: 600;
  font-size: 14px;
}
.port-desc {
  font-size: 13.5px;
  color: var(--muted);
  line-height: 1.6;
}
.empty {
  text-align: center;
  color: var(--muted);
  padding: 40px 16px;
}
</style>
