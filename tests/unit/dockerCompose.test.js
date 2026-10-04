import { describe, expect, it } from 'vitest'
import { load as yamlLoad } from 'js-yaml'
import { dockerToCompose, tokenize } from '@/utils/dockerCompose'

describe('tokenize', () => {
  it('引号内的空格不切分,引号本身被剥掉', () => {
    expect(tokenize(`-e "MSG=hello world" -d nginx`)).toEqual(['-e', 'MSG=hello world', '-d', 'nginx'])
    expect(tokenize(`-e 'A=B C'`)).toEqual(['-e', 'A=B C'])
  })

  it('空串与多余空白', () => {
    expect(tokenize('')).toEqual([])
    expect(tokenize('  a   b ')).toEqual(['a', 'b'])
  })
})

describe('dockerToCompose · 常规转换', () => {
  it('典型命令:端口/卷/环境/重启策略/名字', () => {
    const { yaml, error } = dockerToCompose(
      'docker run -d --name web -p 8080:80 -p 443:443 -v /data:/usr/share/nginx/html:ro -e NGINX_PORT=80 --restart unless-stopped nginx:latest',
    )
    expect(error).toBe('')
    const doc = yamlLoad(yaml)
    const svc = doc.services.web
    expect(svc.image).toBe('nginx:latest')
    expect(svc.container_name).toBe('web')
    expect(svc.ports).toEqual(['8080:80', '443:443'])
    expect(svc.volumes).toEqual(['/data:/usr/share/nginx/html:ro'])
    expect(svc.environment).toEqual({ NGINX_PORT: '80' })
    expect(svc.restart).toBe('unless-stopped')
  })

  it('服务名缺省取镜像名(去 tag、去仓库前缀)', () => {
    const { yaml } = dockerToCompose('docker run registry.example.com/team/my-app:1.2')
    expect(Object.keys(yamlLoad(yaml).services)).toEqual(['my-app'])
  })

  it('-it 组合短旗标 → tty 与 stdin_open', () => {
    const { yaml } = dockerToCompose('docker run -it --rm ubuntu bash')
    const svc = yamlLoad(yaml).services.ubuntu
    expect(svc.tty).toBe(true)
    expect(svc.stdin_open).toBe(true)
    expect(svc.command).toEqual(['bash'])
  })

  it('privileged 与 network', () => {
    const { yaml } = dockerToCompose('docker run --privileged --network host hello-world')
    const svc = yamlLoad(yaml).services['hello-world']
    expect(svc.privileged).toBe(true)
    expect(svc.networks).toEqual(['host'])
  })

  it('yaml 输出可被再次解析(合法 YAML)', () => {
    const { yaml } = dockerToCompose('docker run -p 1:2 alpine')
    expect(() => yamlLoad(yaml)).not.toThrow()
  })
})

describe('dockerToCompose · 未知旗标与错误', () => {
  it('未识别旗标不静默丢弃,进 warnings', () => {
    const { warnings } = dockerToCompose('docker run --gpus all -p 80:80 pytorch/train')
    expect(warnings.some((w) => w.includes('--gpus'))).toBe(true)
    const { yaml } = dockerToCompose('docker run --gpus all -p 80:80 pytorch/train')
    // 服务名取镜像最后一个路径段(pytorch/train → train)
    expect(yamlLoad(yaml).services.train.ports).toEqual(['80:80'])
  })

  it('--rm / -d 给出无需对应的说明', () => {
    const { warnings } = dockerToCompose('docker run -d --rm alpine')
    expect(warnings.some((w) => w.includes('-d'))).toBe(true)
    expect(warnings.some((w) => w.includes('--rm'))).toBe(true)
  })

  it('缺镜像名报错', () => {
    const { error } = dockerToCompose('docker run -d --name x')
    expect(error).toBeTruthy()
  })

  it('空输入返回空结果', () => {
    expect(dockerToCompose('')).toEqual({ yaml: '', warnings: [], error: '' })
  })

  it('不带 docker 前缀也能解析', () => {
    const { yaml, error } = dockerToCompose('run -p 80:80 nginx')
    expect(error).toBe('')
    expect(yamlLoad(yaml).services.nginx.image).toBe('nginx')
  })
})