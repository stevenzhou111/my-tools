import { webcrypto } from 'node:crypto'

// jsdom 不实现 WebCrypto;vmThreads 池下也拿不到 Node 的全局 crypto。
// 浏览器环境原生就有,这里只补测试环境。
if (!globalThis.crypto?.subtle) {
  try {
    Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true })
  } catch {
    // 个别环境 crypto 属性不可配置;浏览器里用不到这条路径
  }
}