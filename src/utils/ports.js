/**
 * 常用端口速查:按服务分类,注明 TCP/UDP 与用途。
 */

export const PORT_GROUPS = [
  {
    id: 'web', label: 'Web 与代理',
    items: [
      { port: 80, proto: 'TCP', name: 'HTTP', desc: '网页明文协议' },
      { port: 443, proto: 'TCP', name: 'HTTPS', desc: '网页加密协议(HTTP over TLS)' },
      { port: 8080, proto: 'TCP', name: 'HTTP-Alt', desc: '常见的备用 Web / 中间件端口' },
      { port: 8443, proto: 'TCP', name: 'HTTPS-Alt', desc: '备用 https(Tomcat/WebLogic 常见)' },
      { port: 8000, proto: 'TCP', name: 'Dev HTTP', desc: '开发服务器常用(python -m http.server 等)' },
      { port: 5173, proto: 'TCP', name: 'Vite', desc: 'Vite 默认开发端口' },
      { port: 3000, proto: 'TCP', name: 'Node Dev', desc: 'React/Next/Express 默认端口' },
      { port: 1080, proto: 'TCP', name: 'SOCKS', desc: 'SOCKS 代理' },
      { port: 3128, proto: 'TCP', name: 'Squid', desc: 'Squid HTTP 代理默认端口' },
    ],
  },
  {
    id: 'remote', label: '远程与文件传输',
    items: [
      { port: 22, proto: 'TCP', name: 'SSH / SFTP', desc: '安全远程登录与文件传输' },
      { port: 23, proto: 'TCP', name: 'Telnet', desc: '明文远程登录,已淘汰' },
      { port: 3389, proto: 'TCP', name: 'RDP', desc: 'Windows 远程桌面' },
      { port: 5900, proto: 'TCP', name: 'VNC', desc: 'VNC 远程控制(5900 + 显示号)' },
      { port: 20, proto: 'TCP', name: 'FTP-Data', desc: 'FTP 数据连接' },
      { port: 21, proto: 'TCP', name: 'FTP', desc: 'FTP 控制连接' },
      { port: 990, proto: 'TCP', name: 'FTPS', desc: 'FTP over TLS(隐式)' },
      { port: 873, proto: 'TCP', name: 'rsync', desc: 'rsync 同步守护进程' },
    ],
  },
  {
    id: 'mail', label: '邮件',
    items: [
      { port: 25, proto: 'TCP', name: 'SMTP', desc: '服务器间投递(云商默认封禁)' },
      { port: 465, proto: 'TCP', name: 'SMTPS', desc: 'SMTP over TLS(隐式)' },
      { port: 587, proto: 'TCP', name: 'Submission', desc: '客户端发信(STARTTLS)' },
      { port: 110, proto: 'TCP', name: 'POP3', desc: '收信(明文)' },
      { port: 995, proto: 'TCP', name: 'POP3S', desc: 'POP3 over TLS' },
      { port: 143, proto: 'TCP', name: 'IMAP', desc: '收信(明文)' },
      { port: 993, proto: 'TCP', name: 'IMAPS', desc: 'IMAP over TLS' },
    ],
  },
  {
    id: 'db', label: '数据库与中间件',
    items: [
      { port: 3306, proto: 'TCP', name: 'MySQL', desc: 'MySQL / MariaDB' },
      { port: 5432, proto: 'TCP', name: 'PostgreSQL', desc: 'PostgreSQL' },
      { port: 1433, proto: 'TCP', name: 'SQL Server', desc: 'Microsoft SQL Server' },
      { port: 1521, proto: 'TCP', name: 'Oracle', desc: 'Oracle 监听器' },
      { port: 6379, proto: 'TCP', name: 'Redis', desc: 'Redis(务必设密码与内网限制)' },
      { port: 27017, proto: 'TCP', name: 'MongoDB', desc: 'MongoDB' },
      { port: 9200, proto: 'TCP', name: 'Elasticsearch', desc: 'ES HTTP 接口(9300 为节点通信)' },
      { port: 5672, proto: 'TCP', name: 'AMQP', desc: 'RabbitMQ 默认(15672 管理界面)' },
      { port: 9092, proto: 'TCP', name: 'Kafka', desc: 'Kafka broker' },
      { port: 11211, proto: 'TCP', name: 'Memcached', desc: 'Memcached' },
    ],
  },
  {
    id: 'infra', label: '基础设施',
    items: [
      { port: 53, proto: 'TCP/UDP', name: 'DNS', desc: '域名解析' },
      { port: 67, proto: 'UDP', name: 'DHCP Server', desc: 'DHCP 服务端(客户端 68)' },
      { port: 123, proto: 'UDP', name: 'NTP', desc: '时间同步' },
      { port: 161, proto: 'UDP', name: 'SNMP', desc: '网络设备管理(默认 community public 应改掉)' },
      { port: 514, proto: 'UDP', name: 'Syslog', desc: '系统日志收集' },
      { port: 389, proto: 'TCP', name: 'LDAP', desc: '目录服务(636 为 LDAPS)' },
      { port: 445, proto: 'TCP', name: 'SMB', desc: 'Windows 文件共享(历史漏洞重灾区)' },
      { port: 1900, proto: 'UDP', name: 'SSDP', desc: 'UPnP 发现' },
    ],
  },
  {
    id: 'ops', label: '运维观测',
    items: [
      { port: 9100, proto: 'TCP', name: 'Prometheus', desc: 'Exporter 指标抓取默认段' },
      { port: 3000, proto: 'TCP', name: 'Grafana', desc: '与 Node 开发端口撞车,注意区分' },
      { port: 9090, proto: 'TCP', name: 'Prometheus', desc: 'Prometheus 自身 UI' },
      { port: 5601, proto: 'TCP', name: 'Kibana', desc: 'Kibana UI' },
      { port: 8500, proto: 'TCP', name: 'Consul', desc: '服务注册与发现' },
      { port: 2379, proto: 'TCP', name: 'etcd', desc: 'etcd 客户端端口(2380 节点互联)' },
      { port: 6443, proto: 'TCP', name: 'K8s API', desc: 'Kubernetes API Server' },
    ],
  },
]

export function allPorts() {
  return PORT_GROUPS.flatMap((g) => g.items.map((it) => ({ ...it, group: g.label, groupId: g.id })))
}
