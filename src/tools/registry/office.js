// 办公辅助分类的工具(10 个)。条目按上线时间追加在本文件内;
// 新增工具请把条目加到对应分类的数组末尾。
import { lazy } from './lazy'

export const TOOLS = [
  {
    id: 'pomodoro', name: '番茄钟', category: 'office', icon: 'timer',
    desc: '专注工作 25 分钟,休息 5 分钟,可自定义时长',
    keywords: '番茄钟 番茄工作法 专注 计时器 pomodoro',
    about: '基于真实时钟倒计时(后台标签页被浏览器节流也不影响准确性),阶段结束自动衔接并播放提示音。',
    component: lazy(() => import('../pomodoro/Pomodoro.vue')),
  },
  {
    id: 'stopwatch', name: '秒表与倒计时', category: 'office', icon: 'alarm-clock',
    desc: '精确到百分秒的秒表(可计次)与倒计时,后台走时也准确',
    keywords: '秒表 停表 计时 倒计时 计次 stopwatch timer 提醒',
    about: '秒表精确到百分秒,支持计次并自动标出最快 / 最慢一圈,计次记录可一键复制 CSV;快捷键:空格开始/暂停、L 计次、R 重置;倒计时时分秒任意组合,附常用预设,结束播放提示音。计时基于系统时间戳而非累计间隔,把页面切到后台或电脑休眠后恢复,结果依然准确。',
    component: lazy(() => import('../stopwatch/Stopwatch.vue')),
  },
  {
    id: 'decision', name: '小决定', category: 'office', icon: 'compass',
    desc: '选择困难症救星:是/否决定,或从选项中随机挑选',
    keywords: '小决定 随机 决定 抽签 选择 yes no',
    about: '两种模式:Yes/No 快速拍板,或多行选项随机抽取(带滚动动画)。',
    component: lazy(() => import('../decision/DecisionTool.vue')),
  },
  {
    id: 'countdown-days', name: '倒数日/纪念日', category: 'office', icon: 'calendar-heart',
    desc: '生日、交付日、纪念日,还有多少天一眼看清,本机保存',
    keywords: '倒数日 纪念日 倒计时 天数 生日 提醒 距离 days matter',
    about: '把重要的日子记下来:单次日期显示「还有/已经多少天」,勾选「每年重复」的生日与纪念日自动滚动到下一个周年,今天到点的条目会高亮。条目按临近程度排序,保存在本机浏览器(localStorage),不上传也不跨设备,清除浏览器数据会丢失,请知悉。',
    component: lazy(() => import('../countdown-days/CountdownDays.vue')),
  },
  {
    id: 'typing-speed', name: '打字速度测试', category: 'office', icon: 'keyboard-music',
    desc: '中文/英文打字测速:实时字速、正确率与最佳纪录',
    keywords: '打字 速度 测试 typing wpm cpm 盲打 练习 字数每分钟',
    about: '30/60/120 秒计时打字测试:中文按「字/分钟(CPM)」、英文按标准 WPM(5 字符 = 1 词)统计,逐字标出对错,正确率实时反馈;最佳纪录存本机,本页会话内保留最近 8 轮成绩。中文用整句拼段、英文用常用句,每轮随机抽题。想提速先保正确率,这是打字练习的黄金法则。',
    component: lazy(() => import('../typing-speed/TypingSpeed.vue')),
  },
  {
    id: 'drawing-pad', name: '在线画板', category: 'office', icon: 'pen-tool',
    desc: '简单好用的手绘画板,支持画笔、橡皮、撤销与导出',
    keywords: '画板 绘画 涂鸦 白板 drawing sketch 画图',
    about: '支持鼠标与触屏手写,8 种常用色、20 步撤销;导出为 1000×620 白底 PNG。',
    component: lazy(() => import('../drawing-pad/DrawingPad.vue')),
  },
  {
    id: 'zip', name: 'ZIP 压缩/解压', category: 'office', icon: 'package',
    desc: '多文件打包为 ZIP,或解压 ZIP 提取其中文件',
    keywords: 'zip 压缩 解压 打包 提取 文件',
    about: '基于 fflate 在浏览器本地完成;解压有单文件 200MB 的安全上限(防压缩炸弹),文本文件可直接预览。',
    component: lazy(() => import('../zip/ZipTool.vue')),
  },
  {
    id: 'weather-lookup', name: '天气查询', category: 'office', icon: 'cloud-sun', online: true, fresh: true,
    desc: '全球城市实时天气与 5 天预报,Open-Meteo 开放数据',
    keywords: '天气 查询 天气预报 气温 降雨 城市 weather 出行 实时天气',
    about: '本站联网工具:城市搜索(中英文)后显示当前气温/体感/湿度/风速与未来 5 天预报,数据来自 Open-Meteo 开放气象服务(免费无密钥);按位置缓存 30 分钟,断网自动回退缓存并如实标注。链接可分享,打开即得该城市天气;预报为模型输出,请以气象台为准。',
    urlState: true,
    component: lazy(() => import('../weather-lookup/WeatherLookup.vue')),
  },
  {
    id: 'random-picker', name: '随机点名/分组', category: 'office', icon: 'dices',
    desc: '名单随机抽人 + 均衡分组,课堂活动两相宜',
    keywords: '随机 点名 抽奖 分组 抽签 名单 随机数 课堂',
    about: '粘贴名单(按换行/逗号/顿号分隔,自动去空去重)后:一键随机抽人,带 1.2 秒滚动动画与最近抽取记录;或按组数均衡分组(轮发分配,人数差不超过 1),结果一键复制。完全本地随机,刷新即重置。',
    component: lazy(() => import('../random-picker/RandomPicker.vue')),
  },
  {
    id: 'gradient', name: 'CSS 渐变生成', category: 'office', icon: 'aperture',
    desc: '可视化调配线性 / 径向渐变,一键复制 CSS 代码',
    keywords: '渐变 gradient css 配色 背景 设计',
    about: '支持线性/径向、任意角度与三色停靠点,内置六组精选配色;复制生成的 CSS 可直接使用。',
    component: lazy(() => import('../gradient/GradientGenerator.vue')),
  },
  {
    id: 'utm-builder', name: 'UTM 链接生成', category: 'office', icon: 'link-2', fresh: true,
    desc: '渠道归因参数拼接,保留原参数与 hash',
    keywords: 'utm 归因 链接 渠道 营销 source medium campaign 推广 参数',
    about: '给推广链接拼接 utm_source/medium/campaign/term/content 五件套,分析后台里分得清流量来自哪个渠道。基于 URL API:原链接的其它查询参数与 #hash 原样保留,重复生成时先清旧 utm_* 防叠加;source/medium 建议必填。纯本地处理。',
    component: lazy(() => import('../utm-builder/UtmBuilder.vue')),
  },
  {
    id: 'timesheet', name: '工时累加', category: 'office', icon: 'hourglass', fresh: true,
    desc: '逐行时间段/时长求和,错行标注',
    keywords: '工时 时长 累加 考勤 时间段 求和 打卡 加班',
    about: '每行一条:09:00-18:00(分隔符 - ~ 至,跨午夜自动进位)或纯时长 8.5h / 90m / 2:15,实时汇总成「x 小时 y 分」并给出逐行明细;看不懂的行标注原因后跳过,不影响其它行。纯本地计算。',
    component: lazy(() => import('../timesheet/TimesheetTool.vue')),
  },
]
