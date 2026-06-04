<!-- 前台浮动按钮组件 - 回到顶部 + 意见反馈 -->
<template>
  <div class="portal-float-buttons">
    <!-- 回到顶部按钮 -->
    <transition name="fade-slide">
      <div v-show="showBackTop" class="float-btn back-top-btn" @click="scrollToTop">
        <ElTooltip content="回到顶部" placement="left">
          <ArtSvgIcon icon="ri:arrow-up-line" class="btn-icon" />
        </ElTooltip>
      </div>
    </transition>

    <!-- 意见反馈按钮 -->
    <div v-if="enableFeedback" class="float-btn feedback-btn" @click="openFeedback">
      <ElTooltip content="意见反馈" placement="left">
        <ArtSvgIcon icon="ri:feedback-line" class="btn-icon" />
      </ElTooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, onUnmounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { useSiteSettingsStore } from '@/store/modules/site-settings'

  defineOptions({ name: 'ArtPortalFloat' })

  const router = useRouter()
  const siteSettingsStore = useSiteSettingsStore()

  // 是否显示回到顶部按钮
  const showBackTop = ref(false)

  // 是否启用反馈功能（从系统设置读取）
  const enableFeedback = computed(() => siteSettingsStore.settings.user.enableFeedback)

  // 监听滚动
  const handleScroll = () => {
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop
    showBackTop.value = scrollTop > 300
  }

  // 回到顶部
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  // 打开意见反馈
  const openFeedback = () => {
    router.push('/feedback')
  }

  onMounted(() => {
    window.addEventListener('scroll', handleScroll)
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll)
  })
</script>

<style scoped lang="scss">
  .portal-float-buttons {
    position: fixed;
    right: 24px;
    bottom: 24px;
    z-index: 999;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .float-btn {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: var(--el-bg-color);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s;
    border: 1px solid var(--el-border-color-lighter);

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    }

    .btn-icon {
      font-size: 20px;
      color: var(--el-text-color-regular);
    }
  }

  .back-top-btn {
    &:hover {
      background: var(--el-color-primary);
      border-color: var(--el-color-primary);

      .btn-icon {
        color: #fff;
      }
    }
  }

  .feedback-btn {
    &:hover {
      background: var(--el-color-success);
      border-color: var(--el-color-success);

      .btn-icon {
        color: #fff;
      }
    }
  }

  // 动画
  .fade-slide-enter-active,
  .fade-slide-leave-active {
    transition: all 0.3s ease;
  }

  .fade-slide-enter-from,
  .fade-slide-leave-to {
    opacity: 0;
    transform: translateY(20px);
  }

  // 移动端适配
  @media (max-width: 768px) {
    .portal-float-buttons {
      right: 16px;
      bottom: 16px;
    }

    .float-btn {
      width: 40px;
      height: 40px;

      .btn-icon {
        font-size: 18px;
      }
    }
  }
</style>
