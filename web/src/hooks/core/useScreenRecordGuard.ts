/**
 * 录屏状态守卫
 * 用于在刷新/关闭页面时保护录屏数据
 */
import { ref } from 'vue'
import { ElMessageBox } from 'element-plus'

// 全局录屏状态
const isRecording = ref(false)
const hasRecordResult = ref(false)

export function useScreenRecordGuard() {
  /**
   * 设置录屏状态
   */
  const setRecordingState = (recording: boolean) => {
    isRecording.value = recording
  }

  /**
   * 设置录制结果状态
   */
  const setRecordResultState = (hasResult: boolean) => {
    hasRecordResult.value = hasResult
  }

  /**
   * 检查是否需要保护（正在录制或有未下载的结果）
   */
  const needsProtection = () => {
    return isRecording.value || hasRecordResult.value
  }

  /**
   * 显示确认对话框（用于刷新按钮）
   * @returns Promise<boolean> - true 表示用户确认继续，false 表示取消
   */
  const confirmRefresh = async (): Promise<boolean> => {
    if (!needsProtection()) {
      return true
    }

    try {
      await ElMessageBox.confirm(
        '录屏正在进行中或有未下载的录制结果，刷新页面将丢失所有录制内容。',
        '确认刷新页面？',
        {
          confirmButtonText: '确定刷新',
          cancelButtonText: '取消',
          type: 'warning',
          dangerouslyUseHTMLString: false,
          distinguishCancelAndClose: true,
          closeOnClickModal: false,
          closeOnPressEscape: false
        }
      )
      return true
    } catch {
      return false
    }
  }

  /**
   * beforeunload 事件处理器（用于浏览器刷新/关闭）
   */
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (needsProtection()) {
      e.preventDefault()
      e.returnValue = '录屏正在进行中，刷新页面将丢失录制内容。确定要离开吗？'
      return e.returnValue
    }
  }

  /**
   * 安装 beforeunload 监听器
   */
  const installBeforeUnloadListener = () => {
    window.addEventListener('beforeunload', handleBeforeUnload)
  }

  /**
   * 卸载 beforeunload 监听器
   */
  const uninstallBeforeUnloadListener = () => {
    window.removeEventListener('beforeunload', handleBeforeUnload)
  }

  return {
    isRecording,
    hasRecordResult,
    setRecordingState,
    setRecordResultState,
    needsProtection,
    confirmRefresh,
    installBeforeUnloadListener,
    uninstallBeforeUnloadListener
  }
}
