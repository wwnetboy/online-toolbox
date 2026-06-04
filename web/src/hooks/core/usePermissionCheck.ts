import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import type PermissionGuard from '@/components/business/permission-guard/index.vue'

/**
 * 权限检查 Hook
 * 用于在工具处理前检查权限，处理后记录使用
 */
export function usePermissionCheck(
  permissionGuardRef: ReturnType<typeof ref<InstanceType<typeof PermissionGuard> | undefined>>
) {
  /**
   * 包装处理函数，自动进行权限检查
   * @param processFn 实际的处理函数
   * @param options 选项
   */
  async function withPermissionCheck<T>(
    processFn: () => Promise<T>,
    options: {
      /** 是否在成功后记录使用，默认 true */
      recordOnSuccess?: boolean
      /** 权限不足时的提示消息 */
      noPermissionMessage?: string
      /** 判断处理是否成功的函数 */
      isSuccess?: (result: T) => boolean
    } = {}
  ): Promise<T | null> {
    const {
      recordOnSuccess = true,
      noPermissionMessage = '今日免费次数已用完，请开通会员继续使用',
      isSuccess = () => true
    } = options

    // 先检查权限
    const hasPermission = await permissionGuardRef.value?.checkBeforeAction()
    if (!hasPermission) {
      ElMessage.warning(noPermissionMessage)
      return null
    }

    // 执行处理
    const result = await processFn()

    // 如果成功，记录使用
    if (recordOnSuccess && isSuccess(result)) {
      permissionGuardRef.value?.recordUsage()
    }

    return result
  }

  /**
   * 仅检查权限（不执行处理）
   */
  async function checkPermission(): Promise<boolean> {
    const hasPermission = await permissionGuardRef.value?.checkBeforeAction()
    if (!hasPermission) {
      ElMessage.warning('今日免费次数已用完，请开通会员继续使用')
      return false
    }
    return true
  }

  /**
   * 仅记录使用（处理成功后调用）
   */
  function recordUsage() {
    permissionGuardRef.value?.recordUsage()
  }

  return {
    withPermissionCheck,
    checkPermission,
    recordUsage
  }
}
