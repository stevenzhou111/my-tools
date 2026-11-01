/**
 * HTTP 请求头/响应头速查:按用途分组,标注方向(请求/响应/两者)。
 * 说明为常用语义速记,完整规范以 RFC 9110 系列与 MDN 为准。
 */

export const HEADER_GROUPS = [
  {
    id: 'auth', label: '认证与鉴权',
    items: [
      { name: 'Authorization', dir: 'req', desc: '携带凭证,如 Bearer <token>、Basic <base64>' },
      { name: 'WWW-Authenticate', dir: 'res', desc: '401 响应里声明认证方式与 realm' },
      { name: 'Proxy-Authorization', dir: 'req', desc: '代理认证凭证' },
      { name: 'Set-Cookie', dir: 'res', desc: '下发 Cookie;HttpOnly/Secure/SameSite 防护属性' },
      { name: 'Cookie', dir: 'req', desc: '回传此前下发的 Cookie' },
    ],
  },
  {
    id: 'cache', label: '缓存',
    items: [
      { name: 'Cache-Control', dir: 'both', desc: '缓存策略总开关:no-store / no-cache / max-age / s-maxage' },
      { name: 'Expires', dir: 'res', desc: '过期时间(HTTP/1.0 遗留,优先级低于 Cache-Control)' },
      { name: 'ETag', dir: 'res', desc: '资源指纹,配合 If-None-Match 做协商缓存' },
      { name: 'If-None-Match', dir: 'req', desc: '回传 ETag,命中则 304' },
      { name: 'If-Modified-Since', dir: 'req', desc: '按时间协商,命中则 304' },
      { name: 'Last-Modified', dir: 'res', desc: '资源最后修改时间' },
      { name: 'Age', dir: 'res', desc: '资源在代理缓存中已存的秒数' },
      { name: 'Vary', dir: 'res', desc: '缓存键之外还要区分的请求头,如 Accept-Encoding' },
    ],
  },
  {
    id: 'content', label: '内容协商与正文',
    items: [
      { name: 'Content-Type', dir: 'both', desc: '正文类型:application/json、text/html;charset=utf-8 等' },
      { name: 'Accept', dir: 'req', desc: '客户端可接受的类型,/;q=0.9 表权重' },
      { name: 'Content-Length', dir: 'both', desc: '正文字节数' },
      { name: 'Content-Encoding', dir: 'both', desc: '压缩算法:gzip、br' },
      { name: 'Accept-Encoding', dir: 'req', desc: '客户端支持的压缩算法' },
      { name: 'Content-Disposition', dir: 'res', desc: 'attachment;filename= 触发下载;multipart 里的字段名' },
      { name: 'Content-Language', dir: 'both', desc: '正文自然语言' },
      { name: 'Accept-Language', dir: 'req', desc: '客户端语言偏好,zh-CN,en;q=0.8' },
      { name: 'Content-Range', dir: 'both', desc: '断点续传:bytes 0-1023/2048' },
      { name: 'Range', dir: 'req', desc: '请求正文的字节区间' },
      { name: 'Location', dir: 'res', desc: '3xx 重定向目标或 201 新资源地址' },
      { name: 'Refresh', dir: 'res', desc: '非标准:定时刷新或跳转' },
    ],
  },
  {
    id: 'cors', label: 'CORS 跨域',
    items: [
      { name: 'Origin', dir: 'req', desc: '请求来源(协议+域+端口),CORS 与 CSRF 判断依据' },
      { name: 'Access-Control-Allow-Origin', dir: 'res', desc: '允许的来源,* 或具体域;带凭证时不能为 *' },
      { name: 'Access-Control-Allow-Methods', dir: 'res', desc: '预检响应:允许的 HTTP 方法' },
      { name: 'Access-Control-Allow-Headers', dir: 'res', desc: '预检响应:允许的自定义请求头' },
      { name: 'Access-Control-Allow-Credentials', dir: 'res', desc: 'true 表示允许携带 Cookie' },
      { name: 'Access-Control-Max-Age', dir: 'res', desc: '预检结果缓存秒数' },
      { name: 'Access-Control-Expose-Headers', dir: 'res', desc: '允许前端 JS 读取的额外响应头' },
    ],
  },
  {
    id: 'security', label: '安全',
    items: [
      { name: 'Strict-Transport-Security', dir: 'res', desc: 'HSTS:强制 https 与有效期,常含 includeSubDomains' },
      { name: 'Content-Security-Policy', dir: 'res', desc: 'CSP:限制脚本/样式来源,防 XSS' },
      { name: 'X-Content-Type-Options', dir: 'res', desc: 'nosniff:禁止 MIME 嗅探' },
      { name: 'X-Frame-Options', dir: 'res', desc: 'DENY / SAMEORIGIN:防点击劫持(CSP frame-ancestors 可替代)' },
      { name: 'Referer', dir: 'req', desc: '来源页完整 URL(可能缺失,隐私策略会裁剪)' },
      { name: 'Referrer-Policy', dir: 'both', desc: '控制 Referer 的发送粒度,strict-origin-when-cross-origin 常用' },
      { name: 'X-Forwarded-For', dir: 'req', desc: '经过代理/负载均衡时的客户端真实 IP 链' },
      { name: 'X-Request-Id', dir: 'both', desc: '链路追踪 ID,排查分布式问题用' },
    ],
  },
  {
    id: 'misc', label: '连接与代理',
    items: [
      { name: 'Host', dir: 'req', desc: '目标域名(必带,虚拟主机路由依据)' },
      { name: 'User-Agent', dir: 'req', desc: '客户端标识:浏览器/系统/引擎(可被伪造)' },
      { name: 'Connection', dir: 'both', desc: 'keep-alive 长连接 / close' },
      { name: 'Accept-Charset', dir: 'req', desc: '已废弃:字符集协商' },
      { name: 'Forwarded', dir: 'req', desc: '标准化版 X-Forwarded-*:by/for/host/proto' },
      { name: 'Via', dir: 'both', desc: '经过的代理链路' },
      { name: 'Date', dir: 'both', desc: '报文产生时间(GMT)' },
      { name: 'Retry-After', dir: 'res', desc: '429/503 后建议重试的秒数或时间' },
      { name: 'Server', dir: 'res', desc: '服务器软件标识(建议精简,避免泄露版本)' },
      { name: 'Allow', dir: 'res', desc: '405 响应里列出该资源支持的方法' },
    ],
  },
]

/** 方向徽标文案 */
export const DIR_LABEL = {
  req: '请求',
  res: '响应',
  both: '双向',
}

/** 拍平供搜索 */
export function allHeaders() {
  return HEADER_GROUPS.flatMap((g) => g.items.map((it) => ({ ...it, group: g.label, groupId: g.id })))
}
