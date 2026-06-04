<template>
  <div class="permission-guard">
    <!-- 加载状态 -->
    <div v-if="loading" class="permission-loading">
      <slot name="loading">
        <div class="flex-c flex-col py-10">
          <ElIcon class="is-loading text-4xl text-primary mb-4">
            <Loading />
          </ElIcon>
          <span class="text-gray-500">正在检查权限...</span>
        </div>
      </slot>
    </div>

    <!-- 有权限时显示内容 -->
    <template v-else-if="hasPermission">
      <!-- 显示剩余次数提示 -->
      <div v-if="showRemainingTip && !isUnlimited" class="permission-remaining-tip">
        <ElAlert :title="remainingTipText" type="warning" :closable="true" show-icon class="mb-4">
          <template #default>
            <span class="text-sm">
              {{ remainingDescription }}
              <ElButton type="primary" link @click="handleUpgrade"> 开通会员 </ElButton>
              享受无限次使用
            </span>
          </template>
        </ElAlert>
      </div>
      <slot></slot>
    </template>

    <!-- 无权限时显示锁定界面 -->
    <template v-else>
      <slot name="locked">
        <div class="permission-locked">
          <div class="locked-content">
            <div class="locked-icon">
              <ElIcon :size="64" class="text-gray-300">
                <Lock />
              </ElIcon>
            </div>
            <h3 class="locked-title">{{ lockedTitle }}</h3>
            <p class="locked-description">{{ lockedDescription }}</p>

            <!-- 会员权益展示 -->
            <div v-if="showBenefits" class="member-benefits">
              <div class="benefit-item" v-for="(benefit, index) in memberBenefits" :key="index">
                <ElIcon :size="20" class="benefit-icon">
                  <component :is="benefit.icon" />
                </ElIcon>
                <span>{{ benefit.text }}</span>
              </div>
            </div>

            <div class="locked-actions">
              <ElButton type="primary" size="large" @click="handleUpgrade">
                <ElIcon class="mr-1"><Medal /></ElIcon>
                开通会员
              </ElButton>
              <ElButton v-if="showLoginButton" size="large" @click="handleLogin">
                登录账号
              </ElButton>
            </div>
          </div>
        </div>
      </slot>
    </template>

    <!-- 会员升级弹窗 -->
    <MemberPopup ref="memberPopupRef" />
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watch, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { Loading, Lock, Check, Star, Unlock, Medal } from '@element-plus/icons-vue'
  import { checkPermission, recordUsage, type PermissionResult } from '@/services/permission'
  import { useUserStore } from '@/store/modules/user'
  import { MemberPopup } from '../member-popup'

  interface Props {
    /** 功能标识 */
    featureId: string
    /** 功能名称（用于显示） */
    featureName?: string
    /** 是否显示升级提示 */
    showUpgradePrompt?: boolean
    /** 是否显示会员权益 */
    showBenefits?: boolean
    /** 是否在使用后自动记录 */
    autoRecord?: boolean
    /** 是否显示剩余次数提示 */
    showRemainingTip?: boolean
  }

  const props = withDefaults(defineProps<Props>(), {
    featureName: '',
    showUpgradePrompt: true,
    showBenefits: true,
    autoRecord: false,
    showRemainingTip: true
  })

  const emit = defineEmits<{
    (e: 'permission-checked', result: PermissionResult): void
    (e: 'permission-denied', reason: string): void
    (e: 'upgrade-click'): void
  }>()

  const router = useRouter()
  const userStore = useUserStore()

  // 状态
  const loading = ref(true)
  const permissionResult = ref<PermissionResult | null>(null)
  const memberPopupRef = ref()

  // 计算属性
  const hasPermission = computed(() => permissionResult.value?.allowed ?? false)

  const isUnlimited = computed(() => {
    return !permissionResult.value?.requireMember || permissionResult.value?.isMember
  })

  const remainingCount = computed(() => permissionResult.value?.remainingCount ?? 0)

  const showLoginButton = computed(() => !userStore.isLogin)

  const lockedTitle = computed(() => {
    if (!permissionResult.value) return '功能受限'

    switch (permissionResult.value.reason) {
      case 'limit_exceeded':
        return '今日免费次数已用完'
      case 'not_member':
        return '会员专属功能'
      case 'feature_disabled':
        return '功能暂不可用'
      default:
        return '功能受限'
    }
  })

  const lockedDescription = computed(() => {
    if (!permissionResult.value) return ''

    const name = props.featureName || '此功能'

    switch (permissionResult.value.reason) {
      case 'limit_exceeded':
        return `${name}今日免费使用次数已达上限，开通会员可无限次使用`
      case 'not_member':
        return `${name}为会员专属功能，开通会员即可使用`
      case 'feature_disabled':
        return `${name}暂时不可用，请稍后再试`
      default:
        return permissionResult.value.message || '请开通会员使用此功能'
    }
  })

  const remainingTipText = computed(() => {
    if (remainingCount.value <= 0) return ''
    return `今日剩余 ${remainingCount.value} 次免费使用`
  })

  const remainingDescription = computed(() => {
    if (remainingCount.value <= 3) {
      return '免费次数即将用完，'
    }
    return ''
  })

  // 会员权益列表
  const memberBenefits = [
    { icon: Unlock, text: '解锁全部高级功能' },
    { icon: Star, text: '无限次使用' },
    { icon: Check, text: '优先技术支持' }
  ]

  // 方法
  async function checkFeaturePermission() {
    loading.value = true

    try {
      const result = await checkPermission(props.featureId, false)
      permissionResult.value = result

      emit('permission-checked', result)

      if (!result.allowed && result.reason) {
        emit('permission-denied', result.reason)
      }
    } catch (error) {
      console.error('[PermissionGuard] 权限检查失败:', error)
      // 发生错误时默认允许访问
      permissionResult.value = { allowed: true }
    } finally {
      loading.value = false
    }
  }

  function handleUpgrade() {
    emit('upgrade-click')
    memberPopupRef.value?.open()
  }

  function handleLogin() {
    router.push({
      name: 'Login',
      query: { redirect: router.currentRoute.value.fullPath }
    })
  }

  /**
   * 记录使用（供外部调用）
   * 记录后会更新本地剩余次数
   * 如果次数用完，allowed 会变为 false，但不会立即显示锁定界面
   * 锁定界面会在下次用户尝试操作时显示（通过 checkBeforeAction）
   */
  async function recordFeatureUsage() {
    if (!isUnlimited.value) {
      await recordUsage(props.featureId)

      // 更新本地剩余次数显示
      if (permissionResult.value && permissionResult.value.remainingCount !== undefined) {
        const newCount = Math.max(0, permissionResult.value.remainingCount - 1)
        permissionResult.value = {
          ...permissionResult.value,
          remainingCount: newCount
        }
      }
    }
  }

  /**
   * 操作前检查权限（供外部调用）
   * 返回是否有权限继续操作
   * 如果没有权限，会自动刷新界面显示锁定状态
   */
  async function checkBeforeAction(): Promise<boolean> {
    // 从服务器获取最新权限状态
    await checkFeaturePermission()
    return hasPermission.value
  }

  // 暴露方法供外部调用
  defineExpose({
    recordUsage: recordFeatureUsage,
    checkPermission: checkFeaturePermission,
    checkBeforeAction,
    hasPermission,
    remainingCount
  })

  // 监听featureId变化
  watch(
    () => props.featureId,
    () => {
      checkFeaturePermission()
    }
  )

  // 初始化
  onMounted(() => {
    checkFeaturePermission()
  })
</script>

<style scoped lang="scss">
  .permission-guard {
    width: 100%;
  }

  .permission-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
  }

  .permission-locked {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    padding: 40px;
    background: linear-gradient(135deg, #f5f7fa 0%, #e4e7ed 100%);
    border-radius: 12px;
  }

  .locked-content {
    max-width: 400px;
    text-align: center;
  }

  .locked-icon {
    margin-bottom: 24px;
  }

  .locked-title {
    margin-bottom: 12px;
    font-size: 24px;
    font-weight: 600;
    color: #303133;
  }

  .locked-description {
    margin-bottom: 24px;
    font-size: 14px;
    line-height: 1.6;
    color: #606266;
  }

  .member-benefits {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    margin-bottom: 24px;
    background: rgb(255 255 255 / 80%);
    border-radius: 8px;
  }

  .benefit-item {
    display: flex;
    gap: 8px;
    align-items: center;
    font-size: 14px;
    color: #606266;
  }

  .benefit-icon {
    color: var(--el-color-primary);
  }

  .locked-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
  }

  .permission-remaining-tip {
    margin-bottom: 16px;
  }
</style>
