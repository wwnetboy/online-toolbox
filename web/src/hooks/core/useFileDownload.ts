/**
 * 文件下载 Composable
 * 统一管理文件下载逻辑
 */
import { ElMessage } from 'element-plus'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

export interface DownloadFileOptions {
  /** 文件名 */
  fileName: string
  /** 文件 Blob */
  blob: Blob
}

export interface DownloadMultipleFilesOptions {
  /** 文件列表 */
  files: Array<{ name: string; blob: Blob }>
  /** ZIP 文件名 */
  zipName: string
}

export function useFileDownload() {
  /**
   * 下载单个文件
   */
  const downloadFile = (options: DownloadFileOptions): void => {
    const { fileName, blob } = options

    try {
      saveAs(blob, fileName)
      ElMessage.success('文件下载成功')
    } catch (error) {
      console.error('文件下载失败:', error)
      ElMessage.error('文件下载失败')
    }
  }

  /**
   * 下载多个文件（打包为 ZIP）
   */
  const downloadMultipleFiles = async (options: DownloadMultipleFilesOptions): Promise<void> => {
    const { files, zipName } = options

    try {
      const zip = new JSZip()

      // 添加所有文件到 ZIP
      files.forEach((file) => {
        zip.file(file.name, file.blob)
      })

      // 生成 ZIP
      const zipBlob = await zip.generateAsync({ type: 'blob' })

      // 下载 ZIP
      saveAs(zipBlob, zipName)
      ElMessage.success('文件打包下载成功')
    } catch (error) {
      console.error('文件打包失败:', error)
      ElMessage.error('文件打包失败')
    }
  }

  /**
   * 下载文本文件
   */
  const downloadText = (fileName: string, content: string): void => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    downloadFile({ fileName, blob })
  }

  /**
   * 下载 JSON 文件
   */
  const downloadJson = (fileName: string, data: any): void => {
    const content = JSON.stringify(data, null, 2)
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
    downloadFile({ fileName, blob })
  }

  /**
   * 从 Canvas 下载图片
   */
  const downloadCanvas = (
    fileName: string,
    canvas: HTMLCanvasElement,
    type = 'image/png'
  ): void => {
    canvas.toBlob((blob) => {
      if (blob) {
        downloadFile({ fileName, blob })
      } else {
        ElMessage.error('Canvas 转换失败')
      }
    }, type)
  }

  return {
    downloadFile,
    downloadMultipleFiles,
    downloadText,
    downloadJson,
    downloadCanvas
  }
}
