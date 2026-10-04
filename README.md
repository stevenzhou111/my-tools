# 我的工具箱

[![CI](https://github.com/stevenzhou111/my-tools/actions/workflows/deploy.yml/badge.svg)](https://github.com/stevenzhou111/my-tools/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

一个基于 **Vue 3 + Vite** 的纯前端在线工具箱,内置 **95 个**常用小工具与 **145 款**精选软件推荐(参考 convry.com / IT-Tools 的工具布局复刻)。

**所有工具均在浏览器本地运行,数据不上传服务器**——纯静态站点、零后端、零跟踪,可一键部署到 Cloudflare Pages,并支持 PWA 安装后完整离线使用。

布局采用经典的**左侧分类导航 + 右侧内容区**:桌面端侧边栏常驻(当前工具高亮、分类可折叠、支持搜索过滤);移动端自动收起为汉堡按钮唤起的抽屉导航。每个工具底部附有可展开的「关于这个工具」使用说明。

## ✨ 内置工具(95 个 / 12 分类)

| 分类 | 工具 |
| ---- | ---- |
| 🔄 编码转换 | JSON 格式化、Base64 编解码、URL 编解码、HTML 转义、进制转换(大数)、文本进制互转、Unicode 转义、哈希计算(SHA 系列)、MD5 编码、URL 解析、JWT 解析、国密 SM2/SM3/SM4、JSON 树查看器 |
| 🛠️ 开发工具 | SQL 格式化(10 种方言)、YAML ↔ JSON、Cron 表达式中文解读、UA 解析、HTTP 状态码速查、Chmod 计算、AES 文本加解密(Web Crypto)、文件哈希校验、JSON → TypeScript 类型、Docker run → compose 转换 |
| 📝 文本工具 | Markdown 预览(可复制 HTML)、正则测试、文本统计、词频统计、文本比对(diff)、文本替换、文本提取(URL/邮箱/数字/手机号/IP)、文本清理、大小写转换、文本反转、空格换行转换、摩尔斯电码、文本分割 |
| 🖼️ 图片工具 | 图片压缩、图片转 Base64、图片圆角、图片旋转翻转、图片加边框、图片滤镜调色(含油画/铅笔画)、颜色吸取器、图片裁切、图片拼接、图片格式转换(PNG/JPG/WebP)、图片加水印(文字/Logo/平铺)、九宫格切图、证件照换背景、图片信息/EXIF 查看 |
| ✨ 生成器 | UUID 生成、密码生成、二维码生成、网址转二维码、WiFi 转二维码(扫码免密连网)、二维码解析、条形码生成、随机数、数字↔英文互转、随机测试数据 |
| 🧮 计算换算 | 时间戳转换、颜色转换(HEX/RGB/HSL)、单位换算(17 大类,含配速与速度互转)、罗马数字互转、日期计算器(日期差/加减天数/工作日)、人民币大写、颜色对比度检查(WCAG AA/AAA)、时区会议换算(18 时区,含夏令时) |
| 📄 文档处理 | PDF 合并、PDF 页面整理(提取/删除/旋转/自定义页序重排/拆分)、PDF 添加水印、PDF 添加页码、图片转 PDF、Excel 格式转换(支持 UTF-8/GBK 的 CSV)、JSON ↔ Excel、Excel 合并/拆分 |
| 🔁 文档转换 | PDF 转图片(pdf.js 逐页渲染)、PDF 提取文本(→ 纯文本/Word/HTML)、PDF 压缩(光栅化)、Word(.docx) 转 HTML、Excel 转图片/PDF、办公格式互转(XLSX↔XLS↔ODS↔CSV↔HTML) |
| 🎬 音视频 | 文字转语音(系统 TTS)、视频截帧、音频剪辑(波形/裁剪/倒放/音量,导出 WAV)、在线录屏(WebM) |
| 📊 数据图表 | 图表制作(柱状/条形/折线/面积/饼/环/雷达/散点/漏斗/仪表盘,导出 PNG) |
| 📎 办公辅助 | 番茄钟、小决定、在线画板、ZIP 压缩/解压、CSS 渐变生成 |
| 💾 软件推荐 | 系统必备软件推荐(145 款人工精选,见下文) |

## 特性

- 🔒 **隐私优先**:全部计算在浏览器完成,无任何网络请求
- 📱 **PWA 离线可用**:可安装到桌面 / 手机,断网也能用全部工具(vite-plugin-pwa 全量预缓存约 184 项;发新版自动检测并刷新,后台定时检查保证已打开的页面也会升级)
- ⌨️ **全局命令面板**:任意页面按 `Ctrl+K` 弹出,↑↓ 选择、Enter 直达任意工具;直接输入算式(如 `12*8+2`)即时出结果、回车复制;内置动作项(切换主题、随机逛工具、快捷键帮助)
- 📋 **剪贴板智能识别**:首页粘贴 JSON / JWT / URL / 颜色 / Base64 / 时间戳等内容,自动推荐对应工具
- 🔗 **状态分享**:颜色、时间戳、进制、二维码、正则、子网、Cron、大写金额等 9 个工具的参数实时同步到地址栏,复制链接即可把「当前配置」发给对方,打开即得同样结果;标题栏出现「分享状态」一键复制
- ⭐ **收藏与最近使用**:工具页一键收藏,自动记录最近 8 个使用的工具,首页和侧边栏置顶展示
- 🎲 **随机逛一个工具**:首页一键随机跳转;工具页底部展示同分类的其他工具,用完一个顺手就能到相邻的
- ⌨️ **快捷键**:全局搜索 `Ctrl+K`、首页聚焦搜索 `/`、快捷键帮助 `?`(顶栏也有入口),面板内 ↑↓/Enter/Esc 导航
- ♿ **无障碍基础**:全局弹层(命令面板/快捷键帮助/移动抽屉)均带 dialog 语义、焦点移入与归还、焦点陷阱;命令面板实现 combobox + listbox + aria-activedescendant 的标准搜索模式,方向键高亮对屏幕阅读器可感知;侧栏折叠按钮带 aria-expanded,图形画布带可读标签
- 🌗 **深色模式**:跟随系统,可手动切换,自动记忆
- 📂 **侧边栏默认折叠**:12 个分类收起为标题,进入工具页时自动展开其所在分类,保持导航清爽
- ⚡ **按需加载**:每个工具独立代码块(chunk),首屏 gzip 约 75 KB;echarts / xlsx / pdf.js / pdf-lib 等大依赖只在打开对应工具时下载;弱网下工具加载失败会显示可重试的错误页,路由级加载失败自动刷新兜底
- ✍️ **草稿自动保存**:核心文本工具(JSON / 正则 / 文本比对 / Markdown 等)的输入内容在会话内自动暂存,误关页面回来不丢
- 🧩 **易于扩展**:注册一个文件即可新增工具(见下文)

## 🧪 测试与质量

```bash
npm test                # 单元测试(Vitest,189 项)
npm run test:watch      # 单元测试 watch 模式
npm run test:e2e        # 端到端测试(Playwright,25 项,含全部 95 个工具页逐页挂载)
```

两层防线:

- **单元测试**覆盖 utils 纯函数(体积格式化、防抖、圆角路径、剪贴板降级、手写 OOXML、人民币大写、日期计算、子网计算、XML 格式化、面板计算器白名单)、收藏/最近使用/草稿指令,以及数据层完整性——工具 id 唯一、分类存在、描述与关键词非空、软件官网是合法 https、图标名存在。数据写错(挂错分类、官网地址打错、图标名拼错)会在测试阶段暴露,而不是等到页面上出现一个空白图标。
- **端到端测试**跑的是真正要发布的构建产物(`vite build` + `vite preview`):从首页抓取全部工具链接,逐页断言异步组件挂载成功、无运行期报错、标题/描述/图标/关于说明齐全;并覆盖命令面板(搜索/计算器/动作项)、URL 状态回填、收藏与最近使用、主题切换、快捷键帮助、移动端抽屉与焦点管理、404 等全局交互。

GitHub Actions 会先跑完两套测试,**全绿才执行部署**(见 `.github/workflows/deploy.yml`)。

## 🚀 本地开发

```bash
npm install
npm run dev          # 开发服务器,默认 http://localhost:5173
npm run build        # 构建产物输出到 dist/
npm run preview      # 本地预览构建结果(http://localhost:4173)
npm test             # 单元测试
npm run test:e2e     # 端到端测试(会自动构建并启动预览)
npm run gen:icons    # 重新生成 SVG 图标数据(改图标映射后执行)
npm run deploy       # vite build && wrangler pages deploy dist
```

环境要求:Node.js ≥ 18。端到端测试首次运行会下载 Playwright Chromium;若网络受限可设置镜像 `PLAYWRIGHT_DOWNLOAD_HOST=https://cdn.npmmirror.com/binaries/playwright`。

## 📁 项目结构

```
├── public/                  # 静态资源(_redirects/_headers/favicon/PWA 图标)
├── scripts/
│   ├── gen-icons.mjs        # 图标映射源(lucide 名 → 路径数据),生成 src/assets/icons.js
│   └── gen-pwa-icons.mjs    # 程序化生成 pwa-192/512.png(解析几何渲染,约 12KB)
├── src/
│   ├── assets/
│   │   ├── base.css         # 设计系统:CSS 变量/明暗主题/通用组件样式
│   │   └── icons.js         # 生成物:裁剪后的 SVG 路径数据(勿手改)
│   ├── components/          # AppIcon / SideNav / CommandPalette / ShortcutsHelp / ToolLoadError
│   ├── data/software.js     # 软件推荐数据(145 款,人工维护)
│   ├── router/              # 路由与标题/最近使用联动
│   ├── tools/
│   │   ├── registry.js      # 唯一数据源:12 分类 + 90 工具(路由/首页/搜索全部由它派生)
│   │   └── <tool>/X.vue     # 每个工具一个目录一个组件(懒加载)
│   ├── utils/               # prefs/draft/clipboard/useCopy/image/pdfjs/docx/
│   │                        # chineseAmount/dateCalc/subnet/xmlFormat/calcExpression/
│   │                        # urlState/theme/toast/format
│   └── views/               # HomeView / ToolView / NotFoundView
├── tests/
│   ├── unit/                # Vitest 单测
│   └── e2e/                 # Playwright 端到端
├── playwright.config.js
├── vite.config.js           # 含 PWA 配置(预缓存 glob 注意含 mjs、不含 png)
└── vitest.config.js
```

## 🧩 如何新增一个工具

1. 在 `src/tools/` 下新建目录和组件,例如 `src/tools/foo/FooTool.vue`;
2. 在 `scripts/gen-icons.mjs` 的 `TOOLS` 映射里给 `foo` 配一个 lucide 图标名,执行 `npm run gen:icons`;
3. 在 `src/tools/registry.js` 中注册:

```js
{
  id: 'foo',                    // 路由 /tool/foo
  name: '示例工具',
  category: 'text',             // 分类 id,见 CATEGORIES
  icon: 'gift',                 // lucide 图标名(与 gen-icons.mjs 映射一致)
  desc: '一句话描述,展示在卡片上',
  keywords: '示例 关键词 用于搜索',
  about: '使用说明,展示在工具底部的折叠面板',
  component: lazy(() => import('./foo/FooTool.vue')),  // lazy 已内置加载失败兜底
}
```

完成。首页卡片、搜索、路由、标题、同分类推荐、端到端测试都会自动生效。全局可用的样式类(`.panel`、`.btn`、`.input`、`.textarea`、`.output`、`.field`、`.grid-2` 等)定义在 `src/assets/base.css`;复制按钮用 `useCopy()`;输入防抖用 `debounce()`;下载文件用 `downloadUrl()/downloadBlob()`;需要"参数可分享"就用 `useUrlState()`。

## 💾 维护软件推荐清单

数据在 `src/data/software.js`,每个条目一个对象:

```js
{ name: 'Everything', cat: 'system', desc: '一句话说明为什么值得装',
  site: 'https://...', platform: 'Windows', tag: '免费', aud: '适合谁(可选)' }
```

约定:`tag` 取值固定(免费/开源/免费+开源/基础免费/个人免费/社区版免费/系统内置/网页/付费);`site` 必须是软件官方 https 地址;不收录有推广合作的项目。单元测试会校验分类存在、域名合法、名称不重复、tag 合法。

## ☁️ 部署到 Cloudflare Pages

以下三种方式任选其一,构建配置均为:

- **构建命令**:`npm run build`
- **输出目录**:`dist`

### 方式一:连接 Git 仓库(推荐)

1. Fork 或推送本仓库到 GitHub / GitLab;
2. 打开 [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**,选择本仓库;
3. 构建设置中:框架预设选 **Vite**(或 None),构建命令 `npm run build`,输出目录 `dist`;
4. 点击 **Save and Deploy**,之后每次 push 都会自动部署,并拿到 `xxx.pages.dev` 域名。

> 项目已内置 `public/_redirects`(`/* → /index.html`),SPA 路由刷新不会 404;`public/_headers` 为带哈希的静态资源开启了长期缓存。

### 方式二:Wrangler 命令行直传

```bash
npx wrangler login
npm run deploy            # 等价于 vite build && wrangler pages deploy dist
```

首次执行会提示创建 Pages 项目,按提示输入项目名(如 `my-toolbox`)即可。

### 方式三:GitHub Actions 自动部署

仓库自带的 `.github/workflows/deploy.yml` 分两步:**test**(单元测试 + 端到端)→ **deploy**(构建并用 wrangler 发布到 Cloudflare Pages)。

1. 在 Cloudflare 创建 API Token(权限:`Cloudflare Pages — Edit`),并获取 Account ID;
2. 在 GitHub 仓库 **Settings → Secrets and variables → Actions** 添加两个 Secret:`CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`;
3. 推送到 `main` 分支即可自动测试并部署。**未配置这两个 Secret 时测试照常运行,部署步骤会自动跳过**。

## 🎨 自定义

- **站点名称**:改 `src/config.js` 的 `APP_NAME`(同时改一下 `index.html` 的 `<title>` 初始值);
- **主题配色**:改 `src/assets/base.css` 顶部的 CSS 变量(明暗两套);
- **分类**:改 `src/tools/registry.js` 中的 `CATEGORIES`;
- **图标**:改 `scripts/gen-icons.mjs` 里的映射后跑 `npm run gen:icons`(lucide 全量图标见 [lucide.dev/icons](https://lucide.dev/icons));
- **PWA 图标**:改 `scripts/gen-pwa-icons.mjs` 里的几何参数后跑 `node scripts/gen-pwa-icons.mjs`。

## 🛠 技术栈

Vue 3(`<script setup>`)· Vue Router 4 · Vite 6 · vite-plugin-pwa · marked + DOMPurify · qrcode · jsQR · JsBarcode · pdf-lib · pdf.js · mammoth · SheetJS(xlsx) · echarts(按需引入) · fflate · blueimp-md5 · spark-md5 · sm-crypto · sql-formatter · js-yaml · cronstrue · ua-parser-js · exifr · Web Speech / Web Audio / MediaRecorder / Canvas API

测试:Vitest · @vue/test-utils · Playwright · GitHub Actions CI

## 与 convry.com 的差异说明

本工具箱定位为**纯静态、纯前端**(方便部署到 Cloudflare Pages、数据不出浏览器),因此 convry 中依赖服务器或 AI 模型的能力未收录:服务端视频转码/下载、服务端 TTS、音频转码/伴奏人声提取、AI 抠图/去水印/OCR/图片放大、GIF 系列合成、高保真 PDF ↔ Office 互转等。

其中部分需求已用纯前端方案实现了等价或近似版本:录屏(浏览器 MediaRecorder)、文字转语音(系统自带 TTS)、OCR 场景可先用截图 + 人工核对替代。其余文本、数字、加密、条码、PDF、Excel、图表、单位、办公辅助类工具均已实现。

## 隐私

- 所有工具的计算都在你的浏览器里完成,**没有任何请求发往服务器**;
- 收藏、最近使用、主题、草稿只存在本机 localStorage / sessionStorage,不上传、不同步;
- 软件推荐页的官网链接是人工维护的静态数据,与所列软件无任何推广合作;下载请认准官网,谨防捆绑。

## License

[MIT](./LICENSE)