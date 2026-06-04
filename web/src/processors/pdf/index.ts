/**
 * PDF处理器模块
 * 导出所有PDF处理器
 */

// 导出共享类型
export * from './types'

// 导出各处理器（排除重复的类型）
export { PdfMergeProcessor, type PdfMergeOptions, type PdfMergeResult } from './merge'

export { PdfSplitProcessor, type PdfSplitOptions, type PdfSplitResult } from './split'

export { PdfCompressProcessor, type PdfCompressOptions, type PdfCompressResult } from './compress'

export {
  PdfPageProcessor,
  type PdfExtractOptions,
  type PdfDeleteOptions,
  type PdfRotateOptions,
  type PdfReorderOptions,
  type PdfPageInfo
} from './pages'

export { PdfWatermarkProcessor, type PdfWatermarkOptions } from './watermark'

export { PdfEncryptProcessor, type PdfEncryptOptions, type PdfDecryptOptions } from './encrypt'

export {
  ImageToPdfProcessor,
  createImageToPdfProcessor,
  type PageSize as ImageToPdfPageSize,
  type PageOrientation as ImageToPdfOrientation,
  type ImageQuality,
  type ImageToPdfOptions,
  type ImageToPdfResult
} from './image-to-pdf'

export {
  PdfToImageProcessor,
  createPdfToImageProcessor,
  type ImageFormat,
  type DpiSetting,
  type PageSelection,
  type PdfToImageOptions,
  type PageImageResult,
  type PdfToImageResult,
  type PdfPageInfo as PdfToImagePageInfo
} from './pdf-to-image'

export {
  PageNumberProcessor,
  createPageNumberProcessor,
  toRomanNumeral,
  toChineseNumeral,
  formatPageNumber,
  defaultPageNumberOptions,
  type PageNumberPosition,
  type PageNumberFormat,
  type PageNumberOptions
} from './page-number'

export {
  CropProcessor,
  createCropProcessor,
  validateCropArea,
  defaultCropOptions,
  type CropArea,
  type CropMode,
  type CropOptions,
  type PageDimension
} from './crop'

export {
  UnlockProcessor,
  createUnlockProcessor,
  defaultUnlockOptions,
  type UnlockOptions,
  type EncryptionInfo
} from './unlock'

export {
  SignatureProcessor,
  createSignatureProcessor,
  defaultSignatureOptions,
  defaultSignatureData,
  defaultSignaturePlacement,
  type SignatureType,
  type SignatureData,
  type SignaturePlacement,
  type SignatureItem,
  type SignatureOptions,
  type PageInfo as SignaturePageInfo
} from './signature'

export {
  RedactProcessor,
  createRedactProcessor,
  defaultRedactionOptions,
  type RedactionAreaType,
  type RedactionArea,
  type TextMatch,
  type RedactionOptions,
  type PageInfo as RedactPageInfo
} from './redact'

export {
  CompareProcessor,
  createCompareProcessor,
  type ChangeType,
  type ContentType,
  type Change,
  type LayoutChange,
  type ComparisonResult,
  type Highlight,
  type SideBySideView
} from './compare'

export {
  PdfEditor,
  createPdfEditor,
  defaultTextEdit,
  defaultShapeEdit,
  defaultAnnotationEdit,
  type EditOperationType,
  type ShapeType,
  type AnnotationType,
  type TextEdit,
  type ImageEdit,
  type ShapeEdit,
  type AnnotationEdit,
  type EditOperation,
  type EditorState,
  type PageInfo as EditorPageInfo
} from './editor'

export {
  RepairProcessor,
  createRepairProcessor,
  defaultRepairOptions,
  type RepairLevel,
  type RepairOptions,
  type DiagnosisIssueType,
  type IssueSeverity,
  type DiagnosisIssue,
  type DiagnosisResult,
  type RepairResult
} from './repair'
