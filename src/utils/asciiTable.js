/**
 * ASCII 表数据:0~127 全量生成,控制字符附标准缩写与转义写法。
 */

const CTRL = [
  ['NUL', '\\0', '空字符'], ['SOH', '', '标题开始'], ['STX', '', '正文开始'], ['ETX', '', '正文结束'],
  ['EOT', '', '传输结束'], ['ENQ', '', '询问'], ['ACK', '', '确认'], ['BEL', '\\a', '响铃'],
  ['BS', '\\b', '退格'], ['HT', '\\t', '水平制表'], ['LF', '\\n', '换行'], ['VT', '\\v', '垂直制表'],
  ['FF', '\\f', '换页'], ['CR', '\\r', '回车'], ['SO', '', '移出'], ['SI', '', '移入'],
  ['DLE', '', '数据链路转义'], ['DC1', '', '设备控制1(XON)'], ['DC2', '', '设备控制2'], ['DC3', '', '设备控制3(XOFF)'], ['DC4', '', '设备控制4'],
  ['NAK', '', '否定确认'], ['SYN', '', '同步空闲'], ['ETB', '', '传输块结束'], ['CAN', '', '取消'],
  ['EM', '', '媒介结束'], ['SUB', '', '替换'], ['ESC', '\\e', '转义'], ['FS', '', '文件分隔'],
  ['GS', '', '组分隔'], ['RS', '', '记录分隔'], ['US', '', '单元分隔'],
]

/** 生成 0~127 全表 */
export function asciiTable() {
  const rows = []
  for (let i = 0; i < 128; i++) {
    const row = {
      dec: i,
      hex: i.toString(16).padStart(2, '0').toUpperCase(),
      oct: i.toString(8).padStart(3, '0'),
      bin: i.toString(2).padStart(8, '0'),
      char: i < 32 || i === 127 ? '' : String.fromCharCode(i),
      type: i < 32 ? 'ctrl' : i === 127 ? 'ctrl' : i < 48 ? 'punct' : i < 58 ? 'digit' : i < 65 ? 'punct' : i < 91 ? 'upper' : i < 97 ? 'punct' : i < 123 ? 'lower' : 'punct',
    }
    if (i < 32) {
      row.abbr = CTRL[i][0]
      row.esc = CTRL[i][1]
      row.name = CTRL[i][2]
      row.char = CTRL[i][1] || row.abbr
    } else if (i === 127) {
      row.abbr = 'DEL'
      row.esc = ''
      row.name = '删除'
      row.char = 'DEL'
    } else if (i === 32) {
      row.abbr = 'SP'
      row.name = '空格'
    }
    rows.push(row)
  }
  return rows
}

/** 分类筛选(供界面按钮):all / ctrl / digit / upper / lower / punct */
export function filterRows(rows, type) {
  return type === 'all' ? rows : rows.filter((r) => r.type === type)
}
