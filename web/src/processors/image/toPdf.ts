/**
 * 图片转PDF处理器
 * 实现多图合并为PDF
 * 需求: 23.1, 23.2, 23.3, 23.4, 23.5
 */

import { PDFDocument } from 'pdf-lib'

export type PageSize = 'A4' | 'A3' | 'Letter' | 'Legal'
export type PageOrientation = 'portrait' | 'landscape'

export interface ImageToPdfOptions {
  pageSize: PageSize
  orientation: PageOrientation
  margin: number // 页边距（像素）
  fitToPage: boolean // 是否适配页面大小
}

export interface ImageToPdfResult {
  file: Blob
  fileName: string
  pageCount: number
  fileSize: number
}

// 页面尺寸定义（单位：点，1点 = 1/72英寸）
const PAGE_SIZES: Record<PageSize, { width: number; height: number }> = {
  A4: { width: 595, height: 842 },
  A3: { width: 842, height: 1191 },
  Letter: { width: 612, height: 792 },
  Legal: { width: 612, height: 1008 }
}

/**
 * 将多张图片转换为PDF
 * @param files 图片文件列表（按顺序）
 * @param options 转换选项
 * @returns 转换结果
 */
export async function imagesToPdf(
  files: File[],
  options: ImageToPdfOptions
): Promise<ImageToPdfResult> {
  if (files.length === 0) {
    throw new Error('至少需要一张图片')
  }

  // 创建 PDF 文档
  const pdfDoc = await PDFDocument.create()

  // 获取页面尺寸
  const pageSize = getPageSize(options.pageSize, options.orientation)

  // 处理每张图片
  for (const file of files) {
    await addImageToPage(pdfDoc, file, pageSize, options)
  }

  // 保存 PDF
  const pdfBytes = await pdfDoc.save()
  const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })

  return {
    file: blob,
    fileName: `图片转PDF_${Date.now()}.pdf`,
    pageCount: pdfDoc.getPageCount(),
    fileSize: blob.size
  }
}

/**
 * 添加图片到PDF页面
 */
async function addImageToPage(
  pdfDoc: PDFDocument,
  file: File,
  pageSize: { width: number; height: number },
  options: ImageToPdfOptions
): Promise<void> {
  // 读取图片数据
  const imageBytes = await file.arrayBuffer()

  // 嵌入图片
  let image
  if (file.type === 'image/png') {
    image = await pdfDoc.embedPng(imageBytes)
  } else if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
    image = await pdfDoc.embedJpg(imageBytes)
  } else {
    // 其他格式需要先转换为 PNG 或 JPG
    const convertedImage = await convertImageToJpeg(file)
    const convertedBytes = await convertedImage.arrayBuffer()
    image = await pdfDoc.embedJpg(convertedBytes)
  }

  // 创建新页面
  const page = pdfDoc.addPage([pageSize.width, pageSize.height])

  // 计算图片尺寸和位置
  const imageDimensions = calculateImageDimensions(
    image.width,
    image.height,
    pageSize.width,
    pageSize.height,
    options.margin,
    options.fitToPage
  )

  // 绘制图片（居中）
  const x = (pageSize.width - imageDimensions.width) / 2
  const y = (pageSize.height - imageDimensions.height) / 2

  page.drawImage(image, {
    x,
    y,
    width: imageDimensions.width,
    height: imageDimensions.height
  })
}

/**
 * 获取页面尺寸
 * 需求 23.3, 23.4: 支持选择纸张大小和页面方向
 */
function getPageSize(
  size: PageSize,
  orientation: PageOrientation
): { width: number; height: number } {
  const dimensions = PAGE_SIZES[size]

  if (orientation === 'landscape') {
    // 横向：交换宽高
    return {
      width: dimensions.height,
      height: dimensions.width
    }
  }

  return dimensions
}

/**
 * 计算图片在页面上的尺寸
 * 需求 23.5: 支持设置页边距
 */
function calculateImageDimensions(
  imageWidth: number,
  imageHeight: number,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  fitToPage: boolean
): { width: number; height: number } {
  // 可用空间
  const availableWidth = pageWidth - margin * 2
  const availableHeight = pageHeight - margin * 2

  if (!fitToPage) {
    // 不适配页面，使用原始尺寸（但不超过可用空间）
    return {
      width: Math.min(imageWidth, availableWidth),
      height: Math.min(imageHeight, availableHeight)
    }
  }

  // 适配页面，保持宽高比
  const imageRatio = imageWidth / imageHeight
  const availableRatio = availableWidth / availableHeight

  if (imageRatio > availableRatio) {
    // 图片更宽，以宽度为准
    return {
      width: availableWidth,
      height: availableWidth / imageRatio
    }
  } else {
    // 图片更高，以高度为准
    return {
      width: availableHeight * imageRatio,
      height: availableHeight
    }
  }
}

/**
 * 将图片转换为 JPEG 格式
 */
async function convertImageToJpeg(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()

    reader.onload = (e) => {
      img.src = e.target?.result as string

      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('无法创建 Canvas 上下文'))
          return
        }

        ctx.drawImage(img, 0, 0)

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('图片转换失败'))
              return
            }
            resolve(blob)
          },
          'image/jpeg',
          0.95
        )
      }

      img.onerror = () => {
        reject(new Error('图片加载失败'))
      }
    }

    reader.onerror = () => {
      reject(new Error('文件读取失败'))
    }

    reader.readAsDataURL(file)
  })
}

/**
 * 验证转换选项
 */
export function validateToPdfOptions(options: ImageToPdfOptions): {
  valid: boolean
  error?: string
} {
  if (options.margin < 0) {
    return {
      valid: false,
      error: '页边距不能为负数'
    }
  }

  const validPageSizes: PageSize[] = ['A4', 'A3', 'Letter', 'Legal']
  if (!validPageSizes.includes(options.pageSize)) {
    return {
      valid: false,
      error: '无效的页面尺寸'
    }
  }

  const validOrientations: PageOrientation[] = ['portrait', 'landscape']
  if (!validOrientations.includes(options.orientation)) {
    return {
      valid: false,
      error: '无效的页面方向'
    }
  }

  return { valid: true }
}

/**
 * 获取默认转换选项
 */
export function getDefaultToPdfOptions(): ImageToPdfOptions {
  return {
    pageSize: 'A4',
    orientation: 'portrait',
    margin: 20,
    fitToPage: true
  }
}
