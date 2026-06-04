/**
 * 权限守卫 Composable
 * 统一管理权限检查和使用记录
 */
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import type PermissionGuard from '@/components/business/permission-guard/index.vue'

export interface UsePermissionGuardOptions {
  /** 功能标识 */
  featureId: string
  /** 功能名称 */
  featureName: string
  /** 是否自动记录使用 */
  autoRecord?: boolean
}

export function usePermissionGuard(options: UsePermissionGuardOptions) {
  const { featureId, featureName, autoRecord = true } = options

  // 权限守卫组件引用
  const permissionGuardRef = ref<InstanceType<typeof PermissionGuard>>()

  /**
   * 检查权限（在操作前调用）
   * @returns 是否有权限
   */
  const checkBeforeAction = async (): Promise<boolean> => {
    if (!permissionGuardRef.value) {
      console.warn('PermissionGuard 组件未挂载')
      return true // 如果组件未挂载，默认允许
    }

    try {
      const hasPermission = await permissionGuardRef.value.checkBeforeAction()
      return hasPermission
    } catch (error) {
      console.error('权限检查失败:', error)
      ElMessage.error('权限检查失败')
      return false
    }
  }

  /**
   * 记录功能使用（在操作成功后调用）
   */
  const recordUsage = async (): Promise<void> => {
    if (!permissionGuardRef.value) {
      console.warn('PermissionGuard 组件未挂载')
      return
    }

    try {
      await permissionGuardRef.value.recordUsage()
    } catch (error) {
      console.error('记录使用失败:', error)
      // 记录失败不影响主流程，只打印警告
    }
  }

  /**
   * 执行带权限检查的操作
   * @param action 要执行的操作
   * @returns 操作结果
   */
  const executeWithPermission = async <T>(action: () => Promise<T>): Promise<T | null> => {
    // 检查权限
    const hasPermission = await checkBeforeAction()
    if (!hasPermission) {
      return null
    }

    // 执行操作
    try {
      const result = await action()

      // 如果自动记录，在操作成功后记录使用
      if (autoRecord) {
        await recordUsage()
      }

      return result
    } catch (error) {
      console.error('操作执行失败:', error)
      throw error
    }
  }

  return {
    permissionGuardRef,
    checkBeforeAction,
    recordUsage,
    executeWithPermission
  }
}
