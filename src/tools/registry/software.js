// 软件推荐分类的工具(1 个)。条目按上线时间追加在本文件内;
// 新增工具请把条目加到对应分类的数组末尾。
import { lazy } from './lazy'

export const TOOLS = [
  {
    id: 'software-recommend', name: '系统必备软件推荐', category: 'software', icon: 'app-window',
    desc: '人工精选的装机必备清单:系统 / 开发 / 办公 / 影音 / 安全 / 备份等 14 类',
    keywords: '软件推荐 装机必备 必备软件 精选 清单 下载 系统',
    about: '145 款长期使用与社区口碑验证的软件,按 14 大用途分类(系统/开发/办公/影音/下载/远程/安全/备份/输入法/浏览器扩展/邮件通讯/虚拟机/文件传输/磁盘恢复),标注免费与开源属性、适用人群并直达官网。杀毒软件覆盖国内外主流产品并如实标注特点;清单为人工维护的静态数据(非自动抓取),与所列软件无任何推广合作;下载请认准官网,谨防捆绑。',
    component: lazy(() => import('../software-recommend/SoftwareRecommend.vue')),
  },
]
