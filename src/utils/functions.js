/**
 * Pages Functions 调用封装:同源 /api/* 请求,统一错误处理。
 * 注意:Functions 只在部署后的 Pages(或本地 wrangler pages dev)可用;
 * 纯 vite dev/preview 下 /api 返回 404,调用方需把错误如实展示。
 */

export async function callFunction(path, params) {
  const qs = new URLSearchParams(params || {}).toString()
  let res
  try {
    res = await fetch(`${path}${qs ? `?${qs}` : ''}`)
  } catch (e) {
    throw new Error(`网络请求失败:${e.message}`)
  }
  let data
  try {
    data = await res.json()
  } catch {
    throw new Error(`服务返回异常(${res.status})。本地开发请用 wrangler pages dev 启动以启用 /api。`)
  }
  if (!res.ok) throw new Error(data?.error || `服务返回 ${res.status}`)
  return data
}
