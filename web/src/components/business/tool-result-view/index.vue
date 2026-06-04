<template>
  <div class="tool-result-view">
    <template v-if="type === 'success'">
      <div class="success-message-box">
        <div class="success-header">
          <ElIcon class="success-icon"><CircleCheck /></ElIcon>
          <p class="success-title">{{ title || '处理完成！' }}</p>
        </div>
        <div class="success-content">
          <slot />
        </div>
        <div class="success-actions">
          <slot name="actions" />
        </div>
      </div>
    </template>

    <template v-else-if="type === 'error'">
      <div class="error-message-box">
        <div class="error-header">
          <ElIcon class="error-icon"><CircleClose /></ElIcon>
          <p class="error-title">{{ title || '处理失败' }}</p>
        </div>
        <div class="error-content">{{ message }}</div>
        <div class="error-actions">
          <ElButton type="primary" @click="$emit('retry')">{{ retryText || '重试' }}</ElButton>
          <ElButton v-if="showReset" @click="$emit('reset')">{{ resetText || '返回' }}</ElButton>
        </div>
      </div>
    </template>

    <template v-else-if="type === 'loading'">
      <div class="processing-message-box">
        <!-- 头部：图标转换动画 -->
        <div class="processing-header">
          <div class="processing-icon-wrapper">
            <div class="processing-icon-bg"></div>
            <slot name="icon-from">
              <Icon :icon="iconFrom || 'ri:file-pdf-2-fill'" class="processing-icon-from" />
            </slot>
            <Icon icon="ri:arrow-right-line" class="processing-icon-arrow" />
            <slot name="icon-to">
              <Icon :icon="iconTo || 'ri:file-pdf-2-fill'" class="processing-icon-to" />
            </slot>
          </div>
          <p class="processing-title">{{ loadingText || '正在处理' }}</p>
        </div>

        <!-- 内容：进度信息 -->
        <div class="processing-content">
          <!-- 进度环 -->
          <div class="processing-spinner">
            <svg class="spinner-ring" viewBox="0 0 50 50">
              <circle
                class="spinner-path"
                cx="25"
                cy="25"
                r="20"
                fill="none"
                stroke-width="4"
              ></circle>
            </svg>
            <div class="spinner-percentage">{{ percentage || 0 }}%</div>
          </div>

          <!-- 状态文本 -->
          <p class="processing-status">{{ statusText }}</p>

          <!-- 进度条 -->
          <ElProgress 
            :percentage="percentage || 0" 
            :stroke-width="6"
            :show-text="false"
            class="processing-progress-bar"
          />

          <!-- 提示信息 -->
          <div class="processing-tips">
            <Icon icon="ri:information-line" class="tip-icon" />
            <span>{{ tipText || '请保持页面打开，处理过程可能需要几秒钟' }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { CircleClose, RefreshRight, Loading, CircleCheck } from '@element-plus/icons-vue'
  import { Icon } from '@iconify/vue'

  defineOptions({ name: 'ToolResultView' })

  interface Props {
    type: 'success' | 'error' | 'loading'
    title?: string
    message?: string
    retryText?: string
    resetText?: string
    showReset?: boolean
    loadingText?: string
    percentage?: number
    iconFrom?: string
    iconTo?: string
    tipText?: string
  }

  const props = withDefaults(defineProps<Props>(), {
    title: '',
    message: '',
    retryText: '重试',
    resetText: '返回',
    showReset: true,
    loadingText: '正在处理',
    percentage: 0,
    tipText: '请保持页面打开,处理过程可能需要几秒钟'
  })

  defineEmits<{
    retry: []
    reset: []
  }>()

  // 状态文本
  const statusText = computed(() => {
    if (props.percentage < 10) return '正在上传文件...'
    if (props.percentage < 90) return `正在处理... ${props.percentage}%`
    return '正在下载结果...'
  })
</script>


<style scoped lang="scss">
  // 处理中消息框
  .processing-message-box {
    max-width: 360px !important;
    width: 100%;
    margin: 0 auto;
    padding: 24px;
    background: linear-gradient(135deg, rgba(64, 158, 255, 0.03) 0%, rgba(103, 194, 58, 0.03) 100%);
    border: 1px solid rgba(64, 158, 255, 0.2);
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
    position: relative;
    overflow: hidden;
    box-sizing: border-box;

    // 背景动画层
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(135deg, rgba(64, 158, 255, 0.02) 0%, rgba(103, 194, 58, 0.02) 100%);
      animation: backdrop-pulse 3s ease-in-out infinite;
      pointer-events: none;
    }

    .processing-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid rgba(64, 158, 255, 0.15);
      position: relative;
      z-index: 1;

      .processing-icon-wrapper {
        display: flex;
        align-items: center;
        gap: 16px;
        position: relative;

        .processing-icon-bg {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 120px;
          height: 120px;
          background: radial-gradient(circle, rgba(64, 158, 255, 0.1) 0%, transparent 70%);
          border-radius: 50%;
          animation: icon-bg-pulse 2s ease-in-out infinite;
        }

        .processing-icon-from {
          font-size: 48px;
          animation: icon-bounce-left 2s ease-in-out infinite;
          filter: drop-shadow(0 4px 8px rgba(64, 158, 255, 0.3));
          position: relative;
          z-index: 1;
        }

        .processing-icon-arrow {
          font-size: 24px;
          color: var(--el-color-primary);
          animation: arrow-slide 1.5s ease-in-out infinite;
          position: relative;
          z-index: 1;
        }

        .processing-icon-to {
          font-size: 48px;
          color: #f56c6c;
          animation: icon-bounce-right 2s ease-in-out infinite;
          filter: drop-shadow(0 4px 8px rgba(245, 108, 108, 0.3));
          position: relative;
          z-index: 1;
        }
      }

      .processing-title {
        font-size: 18px;
        font-weight: 600;
        color: var(--el-color-primary);
        margin: 0;
      }
    }

    .processing-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      position: relative;
      z-index: 1;

      .processing-spinner {
        position: relative;
        width: 80px;
        height: 80px;

        .spinner-ring {
          width: 100%;
          height: 100%;
          transform: rotate(-90deg);
          animation: spinner-rotate 2s linear infinite;
        }

        .spinner-path {
          stroke: var(--el-color-primary);
          stroke-linecap: round;
          stroke-dasharray: 126;
          stroke-dashoffset: 126;
          animation: spinner-dash 1.5s ease-in-out infinite;
        }

        .spinner-percentage {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 18px;
          font-weight: 600;
          color: var(--el-color-primary);
        }
      }

      .processing-status {
        font-size: 14px;
        color: var(--el-text-color-secondary);
        margin: 0;
      }

      .processing-progress-bar {
        width: 100%;

        :deep(.el-progress-bar__outer) {
          background-color: rgba(64, 158, 255, 0.15);
        }

        :deep(.el-progress-bar__inner) {
          background: linear-gradient(90deg, #409eff 0%, #67c23a 100%);
          transition: width 0.3s ease;
        }
      }

      .processing-tips {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px;
        background: rgba(64, 158, 255, 0.08);
        border: 1px solid rgba(64, 158, 255, 0.15);
        border-radius: 6px;
        font-size: 13px;
        line-height: 1.6;
        color: var(--el-text-color-secondary);
        width: 100%;

        .tip-icon {
          font-size: 16px;
          color: var(--el-color-primary);
          flex-shrink: 0;
        }
      }
    }
  }

  // 错误消息框
  .error-message-box {
    max-width: 360px;
    margin: 0 auto;
    padding: 24px;
    background: #fef0f0;
    border: 1px solid #fde2e2;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(245, 108, 108, 0.1);

    .error-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid #fde2e2;

      .error-icon {
        font-size: 32px;
        color: #f56c6c;
        flex-shrink: 0;

        :deep(.el-icon) {
          font-size: 32px;
        }
      }

      .error-title {
        font-size: 18px;
        font-weight: 600;
        color: #f56c6c;
        margin: 0;
      }
    }

    .error-content {
      font-size: 14px;
      line-height: 1.8;
      color: #606266;
      white-space: pre-wrap;
      word-break: break-word;
      margin-bottom: 20px;
      padding: 12px;
      background: rgba(255, 255, 255, 0.5);
      border-radius: 6px;
    }

    .error-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }
  }

  // 成功消息框
  .success-message-box {
    max-width: 360px;
    margin: 0 auto;
    padding: 24px;
    background: linear-gradient(135deg, rgba(103, 194, 58, 0.03) 0%, rgba(64, 158, 255, 0.03) 100%);
    border: 1px solid rgba(103, 194, 58, 0.2);
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(103, 194, 58, 0.1);

    .success-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid rgba(103, 194, 58, 0.15);

      .success-icon {
        font-size: 32px;
        color: #67c23a;
        flex-shrink: 0;

        :deep(.el-icon) {
          font-size: 32px;
        }
      }

      .success-title {
        font-size: 18px;
        font-weight: 600;
        color: #67c23a;
        margin: 0;
      }
    }

    .success-content {
      margin-bottom: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .success-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }
  }

  // 动画定义
  @keyframes backdrop-pulse {
    0%, 100% {
      opacity: 0.6;
    }
    50% {
      opacity: 1;
    }
  }

  @keyframes icon-bg-pulse {
    0%, 100% {
      transform: translate(-50%, -50%) scale(1);
      opacity: 0.5;
    }
    50% {
      transform: translate(-50%, -50%) scale(1.1);
      opacity: 0.8;
    }
  }

  @keyframes icon-bounce-left {
    0%, 100% {
      transform: translateY(0) scale(1);
    }
    50% {
      transform: translateY(-6px) scale(1.05);
    }
  }

  @keyframes icon-bounce-right {
    0%, 100% {
      transform: translateY(0) scale(1);
    }
    50% {
      transform: translateY(-6px) scale(1.05);
    }
  }

  @keyframes arrow-slide {
    0%, 100% {
      transform: translateX(0);
      opacity: 1;
    }
    50% {
      transform: translateX(8px);
      opacity: 0.6;
    }
  }

  @keyframes spinner-rotate {
    100% {
      transform: rotate(270deg);
    }
  }

  @keyframes spinner-dash {
    0% {
      stroke-dashoffset: 126;
    }
    50% {
      stroke-dashoffset: 31.5;
    }
    100% {
      stroke-dashoffset: 126;
    }
  }
</style>
