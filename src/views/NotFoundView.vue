<template>
  <div class="container">
    <div class="panel notfound">
      <h1>404</h1>
      <p>页面走丢了,这里什么都没有。</p>
      <router-link to="/" class="btn btn-primary">← 返回首页</router-link>
    </div>
  </div>
</template>

<style scoped>
.notfound {
  text-align: center;
  padding: 64px 16px;
}
.notfound h1 {
  font-size: 56px;
  margin-bottom: 4px;
}
.notfound p {
  color: var(--muted);
  margin-bottom: 20px;
}
</style>
