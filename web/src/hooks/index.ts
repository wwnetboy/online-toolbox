// 通用功能集合
export { useCommon } from './core/useCommon'

// 应用模式
export { useAppMode } from './core/useAppMode'

// 权限控制
export { useAuth } from './core/useAuth'

// 表格数据管理方案
export { useTable } from './core/useTable'

// 表格列配置管理
export { useTableColumns } from './core/useTableColumns'

// 主题相关
export { useTheme } from './core/useTheme'

// 礼花+文字滚动
export { useCeremony } from './core/useCeremony'

// 顶栏快速入口
export { useFastEnter } from './core/useFastEnter'

// 顶栏功能管理
export { useHeaderBar } from './core/useHeaderBar'

// 图表相关
export { useChart, useChartComponent, useChartOps } from './core/useChart'

// 布局高度
export { useLayoutHeight, useAutoLayoutHeight } from './core/useLayoutHeight'

// 文件上传
export { useUpload } from './core/useUpload'
export type { UploadFile, UploadError, UploadOptions } from './core/useUpload'

// 文件处理
export { useFileProcessor } from './core/useFileProcessor'
export type {
  ProcessStatus,
  ErrorCode,
  ProcessError,
  ProcessResult,
  BatchProcessResult,
  ProcessProgress,
  ProcessorFunction
} from './core/useFileProcessor'

// 历史记录
export { useHistory } from './core/useHistory'
export type { AddHistoryParams, HistoryFilterOptions } from './core/useHistory'

// 用户偏好
export { usePreference } from './core/usePreference'
export type { UsePreferenceOptions, UsePreferenceReturn } from './core/usePreference'

// 文件下载
export { useFileDownload } from './core/useFileDownload'
export type { DownloadFileOptions, DownloadMultipleFilesOptions } from './core/useFileDownload'

// 工具处理器
export { useToolProcessor } from './core/useToolProcessor'
export type { IProcessor, UseToolProcessorOptions } from './core/useToolProcessor'

// 权限守卫
export { usePermissionGuard } from './core/usePermissionGuard'
export type { UsePermissionGuardOptions } from './core/usePermissionGuard'
