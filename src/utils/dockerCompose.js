/**
 * docker run → docker-compose 转换。
 * 支持常用旗标;不认识的旗标不静默丢弃,收进 warnings 让用户自己补。
 */
import { dump as yamlDump } from 'js-yaml'

/** 带引号感知的分词(单引号/双引号内空格不切分) */
export function tokenize(cmd) {
  const tokens = []
  let cur = ''
  let quote = null
  for (const ch of String(cmd ?? '')) {
    if (quote) {
      if (ch === quote) quote = null
      else cur += ch
    } else if (ch === '"' || ch === "'") {
      quote = ch
    } else if (/\s/.test(ch)) {
      if (cur) tokens.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  if (cur) tokens.push(cur)
  return tokens
}

const BOOL_FLAGS = {
  d: 'detach',
  i: 'stdinOpen',
  t: 'tty',
  rm: '__rm',
  privileged: 'privileged',
}

export function dockerToCompose(cmd) {
  const s = String(cmd ?? '').trim()
  if (!s) return { yaml: '', warnings: [], error: '' }

  const tokens = tokenize(s)
  // 允许三种形态:docker run X / docker X(无 run,直接报缺镜像)/ run X
  let body = tokens
  if (body[0]?.toLowerCase() === 'docker') body = body.slice(1)
  if (body[0]?.toLowerCase() === 'run') body = body.slice(1)

  const service = {}
  const warnings = []
  let image = null
  const command = []
  const bools = new Set()

  let i = 0
  while (i < body.length) {
    const tok = body[i]

    if (tok === '--name') {
      service.container_name = body[++i]
    } else if (tok === '-p' || tok === '--publish') {
      ;(service.ports ??= []).push(body[++i])
    } else if (tok === '-v' || tok === '--volume') {
      ;(service.volumes ??= []).push(body[++i])
    } else if (tok === '-e' || tok === '--env') {
      const kv = body[++i] ?? ''
      const eq = kv.indexOf('=')
      if (eq === -1) {
        ;(service.env_file ??= []).push(kv)
        warnings.push(`-e ${kv} 不是 KEY=VALUE 形式,已按 env_file 处理,请确认`)
      } else {
        service.environment ??= {}
        service.environment[kv.slice(0, eq)] = kv.slice(eq + 1)
      }
    } else if (tok === '--restart') {
      service.restart = body[++i]
    } else if (tok === '--network') {
      ;(service.networks ??= []).push(body[++i])
    } else if (tok.startsWith('--')) {
      const key = tok.slice(2)
      if (key in BOOL_FLAGS && BOOL_FLAGS[key].startsWith('__')) {
        // 如 --rm:compose 里没有对应项,忽略并说明
        warnings.push(`--${key} 在 compose 中无需对应(相当于每次 up 的临时容器),已忽略`)
      } else if (key in BOOL_FLAGS) {
        bools.add(BOOL_FLAGS[key])
      } else if (i + 1 < body.length && !body[i + 1].startsWith('-')) {
        warnings.push(`未识别的旗标 --${key} ${body[i + 1]},已跳过,请手动补到 compose`)
        i++
      } else {
        warnings.push(`未识别的旗标 --${key},已跳过,请手动补到 compose`)
      }
    } else if (/^-[a-zA-Z]{2,}$/.test(tok)) {
      // 组合短旗标:-it → -i -t
      for (const ch of tok.slice(1)) {
        if (ch in BOOL_FLAGS) bools.add(BOOL_FLAGS[ch])
        else warnings.push(`未识别的短旗标 -${ch},已跳过`)
      }
    } else if (/^-[a-zA-Z]$/.test(tok)) {
      const key = tok.slice(1)
      if (key in BOOL_FLAGS) bools.add(BOOL_FLAGS[key])
      else if (i + 1 < body.length) {
        warnings.push(`未识别的旗标 -${key} ${body[i + 1]},已跳过,请手动补到 compose`)
        i++
      } else {
        warnings.push(`未识别的旗标 -${key},已跳过`)
      }
    } else if (image === null) {
      image = tok
    } else {
      command.push(tok)
    }
    i++
  }

  if (!image) return { yaml: '', warnings, error: '没有找到镜像名:docker run 后第一个非旗标参数应为镜像' }

  service.image = image
  if (bools.has('tty')) service.tty = true
  if (bools.has('stdinOpen')) service.stdin_open = true
  if (bools.has('privileged')) service.privileged = true
  if (bools.has('detach')) warnings.push('-d(detach)是 docker run 的运行方式,compose 里无需对应')
  if (bools.has('__rm')) warnings.push('--rm 在 compose 中无需对应,已忽略')
  if (command.length) service.command = command

  const name = (service.container_name || image.split(':')[0].split('/').pop()).replace(/[^\w-]/g, '-')
  const compose = { services: { [name]: service } }

  return { yaml: yamlDump(compose, { lineWidth: 120 }).trim(), warnings: [...new Set(warnings)], error: '' }
}