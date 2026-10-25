// 首屏渲染前应用主题,避免深色模式闪白。
// 独立文件而非内联脚本:配合 index.html 的 CSP(script-src 'self',不允许 unsafe-inline)
;(function () {
  var t = null
  try { t = localStorage.getItem('toolbox-theme') } catch (e) {}
  if (!t) t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  document.documentElement.dataset.theme = t
})()
