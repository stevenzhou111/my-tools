// 音视频分类的工具(10 个)。条目按上线时间追加在本文件内;
// 新增工具请把条目加到对应分类的数组末尾。
import { lazy } from './lazy'

export const TOOLS = [
  {
    id: 'tts', name: '文字转语音', category: 'av', icon: 'mic',
    desc: '使用系统语音朗读文本,可调音色、语速与音调',
    keywords: '文字转语音 tts 朗读 语音合成 配音 播报',
    about: '调用操作系统内置的语音合成引擎(Web Speech API),音色数量取决于系统语言包;朗读在本地进行,不上传文本。',
    component: lazy(() => import('../tts/TtsTool.vue')),
  },
  {
    id: 'video-frame', name: '视频截帧', category: 'av', icon: 'camera',
    desc: '播放本地视频并截取任意画面为图片',
    keywords: '视频 截帧 截图 视频截图 帧 frame',
    about: '支持跳转到指定秒数精确截帧,截取的帧以原始分辨率导出 PNG;视频文件不离开本机。',
    component: lazy(() => import('../video-frame/VideoFrame.vue')),
  },
  {
    id: 'video-gif', name: '视频转 GIF', category: 'av', icon: 'film',
    desc: '截取视频片段转成动图,帧率 / 宽度可调,本地合成',
    keywords: '视频转gif 动图 表情包 截取 片段 gif 制作 mp4 webm',
    about: '加载本地视频后选一段区间(默认前 5 秒),按帧率逐帧采样合成 GIF:宽度与帧率可调(上限 640px / 30fps / 240 帧,防止内存吃紧),生成后预览动画效果、一键下载。逐帧 seek 采样与 GIF 编码全部在浏览器本地完成,视频不上传;时长越长、帧率越高,生成越慢、文件也越大。',
    component: lazy(() => import('../video-gif/VideoGif.vue')),
  },
  {
    id: 'audio-edit', name: '音频剪辑', category: 'av', icon: 'sliders-vertical',
    desc: '波形预览,裁剪片段、倒放、调整音量,导出 WAV',
    keywords: '音频 剪切 裁剪 倒放 音量 wav 波形',
    about: '解码后显示波形图,拖动起点/终点选择区间,支持倒放与 0~300% 音量,导出 16bit PCM WAV。试听使用共享 AudioContext,可反复操作。',
    component: lazy(() => import('../audio-edit/AudioEdit.vue')),
  },
  {
    id: 'screen-record', name: '在线录屏', category: 'av', icon: 'monitor-play',
    desc: '录制屏幕 / 窗口 / 标签页,导出 WebM 视频',
    keywords: '录屏 屏幕录制 录像 录课 record webm',
    about: '开始后由浏览器弹出共享选择器(屏幕/窗口/标签页),支持暂停与麦克风混录;录制内容只保存在本地。需要 https 或 localhost 环境。',
    component: lazy(() => import('../screen-record/ScreenRecord.vue')),
  },
  {
    id: 'cam-mic-test', name: '摄像头麦克风测试', category: 'av', icon: 'webcam',
    desc: '开会前试一试摄像头与麦克风:画面、分辨率、帧率与收音电平',
    keywords: '摄像头 麦克风 测试 会议 视频通话 相机 摄像头检测 麦克风检测 webcam',
    about: '一键开启摄像头与麦克风,本地预览画面并显示实际分辨率 / 帧率,麦克风电平表实时反映收音是否正常,同时列出检测到的全部设备;任何画面与声音都不会被录制或上传。权限被拒、设备被占用等失败情形都有明确的中文提示。需要 https 或 localhost 环境。',
    component: lazy(() => import('../cam-mic-test/CamMicTest.vue')),
  },
  {
    id: 'video-audio', name: '视频提取音频', category: 'av', icon: 'music-2',
    desc: '把视频里的声音提取为 WAV,可继续剪辑,本地解码',
    keywords: '视频转音频 提取音频 视频转wav 配音 音轨 分离 mp4 wav 音乐',
    about: '把有音轨的视频(MP4 / WebM / MOV 等)直接解码出音频并打包为 16bit PCM WAV:无需上传,浏览器 WebAudio 本地解码;提取后可在线试听,或一键跳到「音频剪辑」继续裁剪。无声轨或用了 AC-3/DTS 等浏览器不支持的音频编码时会明确提示。WAV 无压缩体积较大,需要小文件可先用本工具导出再压缩。',
    component: lazy(() => import('../video-audio/VideoAudio.vue')),
  },
  {
    id: 'metronome', name: '节拍器', category: 'av', icon: 'music',
    desc: '2/4·3/4·4/4 节拍器,强拍高音弱拍低音,支持跟拍测速',
    keywords: '节拍器 metronome bpm 练琴 节奏 音乐 打拍子',
    about: '基于 WebAudio 的前瞻式调度(25ms 轮询把拍子排进音频时钟),不受定时器抖动影响;强拍 1400Hz、弱拍 880Hz 短促 click 区分,支持 30–240 BPM、三种拍号与跟拍测速(2 秒内点击取均值)。BPM 与拍号自动记住,声音完全本地合成。',
    component: lazy(() => import('../metronome/Metronome.vue')),
  },
  {
    id: 'pixel-test', name: '屏幕坏点检测', category: 'av', icon: 'circle-dot',
    desc: '全屏循环纯色画面,排查坏点/亮斑/漏光',
    keywords: '坏点 检测 屏幕 显示器 测试 死像素 漏光 full screen',
    about: '逐屏显示纯白/纯黑/红/绿/蓝/灰六种纯色,固定不变的亮点或暗点即为坏点;支持全屏、点击或空格切换颜色、色块直达。新机验货、外接显示器排查都适用,全程离线。',
    component: lazy(() => import('../pixel-test/PixelTest.vue')),
  },
  {
    id: 'audio-record', name: '在线录音', category: 'av', icon: 'audio-lines',
    desc: '麦克风录音:实时电平、暂停继续、本地下载',
    keywords: '录音 麦克风 录音机 语音 留言 记录 memo voice recorder 在线录音',
    about: '一键开始/暂停/继续的网页录音机:实时显示输入电平与计时,自动选择浏览器支持的容器(Chrome/Edge 为 WebM/Opus,Safari 为 MP4/AAC),结束后在线试听、一键下载。默认关闭浏览器降噪与回声消除,保留原始声音,适合录乐器与素材;录音完全在本地进行,不上传。',
    component: lazy(() => import('../audio-record/AudioRecord.vue')),
  },
  {
    id: 'mp3-convert', name: '音频转 MP3', category: 'av', icon: 'audio-lines', fresh: true,
    desc: 'WAV/M4A/OGG/FLAC 本机转 MP3,码率可选',
    keywords: 'mp3 音频 转码 转换 wav m4a ogg flac lame 压缩',
    about: '用浏览器 AudioContext 解码常见音频格式(WAV/MP3/M4A/OGG/FLAC 等),再经 lamejs 本机重编码为 MP3(128~320kbps 可选),转换后在线试听、一键下载。音频在浏览器内解码、浏览器内编码,不上传;无损格式转出来的是有损 MP3,追求音质请保留原文件。',
    component: lazy(() => import('../mp3-convert/Mp3Convert.vue')),
  },
  {
    id: 'bitrate-calc', name: '码率/体积计算', category: 'av', icon: 'gauge', fresh: true,
    desc: '按时长与码率估体积,反推码率与下载耗时',
    keywords: '码率 体积 文件大小 视频带宽 下载时间 计算 剪辑 投稿',
    about: '视频剪辑与投稿三件套:按时长+视频/音频码率估算成品体积(1080p 常用 8000~12000kbps 参考)、按目标体积反推总码率、按体积与带宽估算下载耗时。口径:kbps 千比特每秒,MB 兆字节,总码率=视频+音频。纯计算,本地完成。',
    component: lazy(() => import('../bitrate-calc/BitrateCalc.vue')),
  },
]
