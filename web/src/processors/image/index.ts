/**
 * 图片处理器模块导出
 */

// 共享类型
export * from './types'

// 格式转换
export {
  convertImage,
  convertImageBatch,
  validateImageFile,
  ImageConvertProcessor,
  createImageConvertProcessor,
  type ImageConvertOptions,
  type ImageConvertResult
} from './convert'

// 图片压缩
export {
  compressImage,
  compressImageBatch,
  validateCompressOptions,
  ImageCompressProcessor,
  createImageCompressProcessor,
  type ImageCompressOptions,
  type ImageCompressResult
} from './compress'

// 旋转/翻转
export {
  rotateImage,
  flipImage,
  rotateImageBatch,
  flipImageBatch,
  validateRotateAngle,
  ImageRotateProcessor,
  createImageRotateProcessor,
  type RotateAngle,
  type FlipDirection,
  type ImageRotateOptions,
  type ImageFlipOptions,
  type ImageTransformResult,
  type ImageRotateProcessOptions
} from './rotate'

// 尺寸调整
export {
  resizeImage,
  resizeImageBatch,
  validateResizeOptions,
  getImageDimensions,
  ImageResizeProcessor,
  createImageResizeProcessor,
  type ImageResizeOptions,
  type ImageResizeResult
} from './resize'

// 长图拼接
export {
  spliceImages,
  validateSpliceOptions,
  getDefaultSpliceOptions,
  ImageSpliceProcessor,
  createImageSpliceProcessor,
  type ImageSpliceOptions,
  type ImageSpliceResult
} from './splice'

// 图片转PDF
export {
  imagesToPdf,
  validateToPdfOptions,
  getDefaultToPdfOptions,
  type PageSize,
  type PageOrientation,
  type ImageToPdfOptions,
  type ImageToPdfResult
} from './toPdf'

// Base64互转
export {
  imageToBase64,
  base64ToImage,
  validateBase64,
  calculateBase64FileSize,
  getDefaultImageToBase64Options,
  imageToBase64Batch,
  type Base64Format,
  type ImageToBase64Options,
  type ImageToBase64Result,
  type Base64ToImageResult
} from './base64'
