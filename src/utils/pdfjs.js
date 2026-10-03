import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

/** 加载 PDF 文档(ArrayBuffer/Uint8Array) */
export function loadPdf(data) {
  // pdf.js 会 transfer 输入 buffer,调用方传入前应自行保留原始数据
  return pdfjsLib.getDocument({ data }).promise
}
