<template>
  <ElDialog
    v-model="visible"
    :title="dialogTitle"
    width="600px"
    :close-on-click-modal="false"
    class="member-upgrade-dialog"
  >
    <!-- 次级视图的返回头部 -->
    <template v-if="currentView !== 'main'" #header>
      <div class="secondary-header">
        <ElButton link @click="currentView = 'main'" class="back-button">
          <ElIcon><ArrowLeft /></ElIcon>
          返回
        </ElButton>
        <span class="header-title">{{ dialogTitle }}</span>
      </div>
    </template>

    <div class="upgrade-content">
      <!-- 主视图 -->
      <div v-if="currentView === 'main'" class="main-view">
        <!-- 头部介绍 -->
        <div class="upgrade-header">
          <div class="header-icon">
            <ElIcon :size="48" class="crown-icon">
              <Medal />
            </ElIcon>
          </div>
          <h2 class="header-title">解锁全部高级功能</h2>
          <p class="header-subtitle">
            {{
              featureName
                ? `开通会员即可使用「${featureName}」及所有高级功能`
                : '开通会员享受无限次使用所有工具'
            }}
          </p>
        </div>

        <!-- 会员等级选择 -->
        <div class="plan-selector">
          <div
            v-for="plan in memberPlans"
            :key="plan.id"
            :class="[
              'plan-card',
              { active: selectedPlan === plan.id, recommended: plan.recommended }
            ]"
            @click="selectedPlan = plan.id"
          >
            <div v-if="plan.recommended" class="plan-badge">推荐</div>
            <div class="plan-name">{{ plan.name }}</div>
            <div class="plan-price">
              <span class="price-currency">¥</span>
              <span class="price-amount">{{ plan.price }}</span>
              <span class="price-unit">/{{ plan.unit }}</span>
            </div>
            <div v-if="plan.originalPrice" class="plan-original-price">
              原价 ¥{{ plan.originalPrice }}
            </div>
            <div class="plan-description">{{ plan.description }}</div>
          </div>
        </div>

        <!-- 会员权益列表 -->
        <div class="benefits-section">
          <div class="benefits-header">
            <h3 class="benefits-title">会员权益</h3>
            <ElButton link type="primary" @click="currentView = 'benefits'">
              查看全部 <ElIcon><ArrowRight /></ElIcon>
            </ElButton>
          </div>
          <div class="benefits-grid">
            <div
              v-for="benefit in memberBenefits.slice(0, 4)"
              :key="benefit.title"
              class="benefit-card"
            >
              <ElIcon :size="24" class="benefit-icon">
                <component :is="benefit.icon" />
              </ElIcon>
              <div class="benefit-info">
                <div class="benefit-title">{{ benefit.title }}</div>
                <div class="benefit-desc">{{ benefit.description }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 快捷操作按钮 -->
        <div class="quick-actions">
          <ElButton class="action-button" @click="currentView = 'details'">
            <ElIcon><Document /></ElIcon>
            购买详情
          </ElButton>
          <ElButton class="action-button" @click="currentView = 'help'">
            <ElIcon><QuestionFilled /></ElIcon>
            帮助中心
          </ElButton>
        </div>
      </div>

      <!-- 全部权益视图 -->
      <div v-else-if="currentView === 'benefits'" class="benefits-view">
        <div class="benefits-full">
          <h3 class="section-title">全部会员权益</h3>
          <div class="benefits-grid-full">
            <div v-for="benefit in memberBenefits" :key="benefit.title" class="benefit-card-full">
              <ElIcon :size="32" class="benefit-icon">
                <component :is="benefit.icon" />
              </ElIcon>
              <div class="benefit-info">
                <div class="benefit-title">{{ benefit.title }}</div>
                <div class="benefit-desc">{{ benefit.description }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 功能对比表 -->
        <div class="comparison-section">
          <h3 class="section-title">功能对比</h3>
          <ElTable :data="featureComparison" stripe class="comparison-table">
            <ElTableColumn prop="feature" label="功能" width="200" />
            <ElTableColumn prop="free" label="免费用户" align="center">
              <template #default="{ row }">
                <span v-if="typeof row.free === 'boolean'">
                  <ElIcon v-if="row.free" class="text-green-500"><Check /></ElIcon>
                  <ElIcon v-else class="text-gray-300"><Close /></ElIcon>
                </span>
                <span v-else>{{ row.free }}</span>
              </template>
            </ElTableColumn>
            <ElTableColumn prop="member" label="会员用户" align="center">
              <template #default="{ row }">
                <span v-if="typeof row.member === 'boolean'">
                  <ElIcon v-if="row.member" class="text-green-500"><Check /></ElIcon>
                  <ElIcon v-else class="text-gray-300"><Close /></ElIcon>
                </span>
                <span v-else class="text-primary font-medium">{{ row.member }}</span>
              </template>
            </ElTableColumn>
          </ElTable>
        </div>
      </div>

      <!-- 购买详情视图 -->
      <div v-else-if="currentView === 'details'" class="details-view">
        <div class="order-summary">
          <h3 class="section-title">订单摘要</h3>
          <div class="summary-card">
            <div class="summary-row">
              <span class="label">产品</span>
              <span class="value">{{ selectedPlanInfo.name }}</span>
            </div>
            <div class="summary-row">
              <span class="label">原价</span>
              <span class="value"
                >¥{{ selectedPlanInfo.originalPrice || selectedPlanInfo.price }}</span
              >
            </div>
            <div v-if="selectedPlanInfo.originalPrice" class="summary-row discount">
              <span class="label">优惠</span>
              <span class="value"
                >-¥{{ (selectedPlanInfo.originalPrice - selectedPlanInfo.price).toFixed(2) }}</span
              >
            </div>
            <div class="summary-row total">
              <span class="label">实付</span>
              <span class="value price-highlight">¥{{ selectedPlanInfo.price }}</span>
            </div>
          </div>
        </div>

        <div class="payment-methods">
          <h3 class="section-title">支付方式</h3>
          <ElRadioGroup v-model="paymentMethod" class="payment-options">
            <ElRadio value="wechat" class="payment-option">
              <div class="payment-content">
                <ElIcon :size="24" class="payment-icon wechat"><ChatDotRound /></ElIcon>
                <span>微信支付</span>
              </div>
            </ElRadio>
            <ElRadio value="alipay" class="payment-option">
              <div class="payment-content">
                <ElIcon :size="24" class="payment-icon alipay"><Wallet /></ElIcon>
                <span>支付宝</span>
              </div>
            </ElRadio>
          </ElRadioGroup>
        </div>

        <div class="payment-action">
          <div class="total-display">
            <span class="total-label">合计：</span>
            <span class="total-amount">¥{{ selectedPlanInfo.price }}</span>
          </div>
          <ElButton
            type="primary"
            size="large"
            @click="handlePurchase"
            :loading="purchasing"
            class="pay-button"
          >
            <ElIcon><ShoppingCart /></ElIcon>
            立即支付
          </ElButton>
        </div>
      </div>

      <!-- 帮助中心视图 -->
      <div v-else-if="currentView === 'help'" class="help-view">
        <div class="help-section">
          <h3 class="section-title">常见问题</h3>
          <ElCollapse v-model="activeFaq" class="faq-collapse">
            <ElCollapseItem v-for="faq in faqs" :key="faq.id" :name="faq.id">
              <template #title>
                <div class="faq-title">
                  <ElIcon><QuestionFilled /></ElIcon>
                  {{ faq.question }}
                </div>
              </template>
              <div class="faq-answer">{{ faq.answer }}</div>
            </ElCollapseItem>
          </ElCollapse>
        </div>

        <div class="customer-service">
          <h3 class="section-title">联系客服</h3>
          <div class="service-card">
            <ElIcon :size="48" class="service-icon"><Service /></ElIcon>
            <p class="service-text">如有任何问题，请联系我们的在线客服</p>
            <ElButton type="primary" size="large">
              <ElIcon><ChatDotRound /></ElIcon>
              在线客服
            </ElButton>
          </div>
        </div>

        <div class="policies">
          <h3 class="section-title">相关政策</h3>
          <div class="policy-links">
            <ElButton link type="primary">
              <ElIcon><Document /></ElIcon>
              退款政策
            </ElButton>
            <ElButton link type="primary">
              <ElIcon><Document /></ElIcon>
              支付问题
            </ElButton>
            <ElButton link type="primary">
              <ElIcon><Document /></ElIcon>
              隐私政策
            </ElButton>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div v-if="currentView === 'main'" class="dialog-footer">
        <div class="footer-info">
          <ElIcon class="info-icon"><InfoFilled /></ElIcon>
          <span>支付后立即生效，如有问题请联系客服</span>
        </div>
        <div class="footer-actions">
          <ElButton @click="visible = false">暂不开通</ElButton>
          <ElButton type="primary" size="large" @click="handlePurchase" :loading="purchasing">
            <ElIcon class="mr-1"><ShoppingCart /></ElIcon>
            立即开通
          </ElButton>
        </div>
      </div>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import {
    Medal,
    Check,
    Close,
    InfoFilled,
    ShoppingCart,
    Unlock,
    Timer,
    Service,
    Document,
    Picture,
    Edit,
    Lock,
    ArrowLeft,
    ArrowRight,
    QuestionFilled,
    ChatDotRound,
    Wallet
  } from '@element-plus/icons-vue'

  interface Props {
    /** 控制弹窗显示 */
    modelValue: boolean
    /** 功能标识 */
    featureId?: string
    /** 功能名称 */
    featureName?: string
  }

  const props = withDefaults(defineProps<Props>(), {
    featureId: '',
    featureName: ''
  })

  const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void
    (e: 'purchase', planId: string): void
  }>()

  // 双向绑定
  const visible = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
  })

  // 视图状态
  type ViewType = 'main' | 'benefits' | 'details' | 'help'
  const currentView = ref<ViewType>('main')

  // 状态
  const selectedPlan = ref('yearly')
  const purchasing = ref(false)
  const paymentMethod = ref('wechat')
  const activeFaq = ref<string[]>([])

  // 对话框标题
  const dialogTitle = computed(() => {
    switch (currentView.value) {
      case 'benefits':
        return '会员权益'
      case 'details':
        return '购买详情'
      case 'help':
        return '帮助中心'
      default:
        return '开通会员'
    }
  })

  // 会员套餐
  const memberPlans = [
    {
      id: 'monthly',
      name: '月度会员',
      price: 19.9,
      originalPrice: 29.9,
      unit: '月',
      description: '适合短期使用',
      recommended: false
    },
    {
      id: 'yearly',
      name: '年度会员',
      price: 99,
      originalPrice: 358.8,
      unit: '年',
      description: '超值优惠，省72%',
      recommended: true
    },
    {
      id: 'lifetime',
      name: '终身会员',
      price: 199,
      originalPrice: null,
      unit: '永久',
      description: '一次购买，终身使用',
      recommended: false
    }
  ]

  // 当前选中的套餐信息
  const selectedPlanInfo = computed(() => {
    return memberPlans.find((plan) => plan.id === selectedPlan.value) || memberPlans[1]
  })

  // 会员权益
  const memberBenefits = [
    {
      icon: Unlock,
      title: '解锁全部功能',
      description: '使用所有PDF高级工具'
    },
    {
      icon: Timer,
      title: '无限次使用',
      description: '不限制使用次数'
    },
    {
      icon: Service,
      title: '优先客服支持',
      description: '专属客服快速响应'
    },
    {
      icon: Document,
      title: '批量处理',
      description: '支持批量文件处理'
    },
    {
      icon: Picture,
      title: '高清输出',
      description: '支持高分辨率导出'
    },
    {
      icon: Edit,
      title: '高级编辑',
      description: '使用所有编辑功能'
    },
    {
      icon: Lock,
      title: '数据安全',
      description: '文件加密存储保护'
    },
    {
      icon: Service,
      title: '技术支持',
      description: '7x24小时技术支持'
    }
  ]

  // 功能对比
  const featureComparison = [
    { feature: 'PDF合并/拆分', free: true, member: true },
    { feature: 'PDF压缩', free: true, member: true },
    { feature: '添加水印', free: true, member: true },
    { feature: 'PDF转图片', free: '5次/天', member: '无限' },
    { feature: 'OCR文字识别', free: '2次/天', member: '无限' },
    { feature: 'Office格式转换', free: '3次/天', member: '无限' },
    { feature: 'PDF编辑', free: '1次/天', member: '无限' },
    { feature: 'PDF签名', free: '2次/天', member: '无限' },
    { feature: 'PDF比较', free: '2次/天', member: '无限' },
    { feature: '批量处理', free: false, member: true }
  ]

  // 常见问题
  const faqs = [
    {
      id: '1',
      question: '如何开具发票？',
      answer:
        '购买成功后，您可以在"我的订单"页面申请开具电子发票。我们支持增值税普通发票和专用发票。'
    },
    {
      id: '2',
      question: '会员订阅规则是什么？',
      answer:
        '会员分为月度、年度和终身三种类型。月度和年度会员到期后需要续费，终身会员一次购买永久有效。'
    },
    {
      id: '3',
      question: '支持退款吗？',
      answer:
        '购买后7天内，如果您未使用任何会员功能，可以申请全额退款。超过7天或已使用会员功能的订单不支持退款。'
    },
    {
      id: '4',
      question: '会员可以在多个设备使用吗？',
      answer: '可以。您的会员账号可以在多个设备上登录使用，但同一时间只能在一个设备上使用。'
    },
    {
      id: '5',
      question: '支付遇到问题怎么办？',
      answer:
        '如果支付过程中遇到问题，请联系在线客服或发送邮件至support@example.com，我们会尽快为您解决。'
    }
  ]

  // 方法
  async function handlePurchase() {
    purchasing.value = true

    try {
      // TODO: 实现实际的支付逻辑
      emit('purchase', selectedPlan.value)

      // 模拟支付流程
      ElMessage.info('支付功能开发中，敬请期待')
    } catch (error) {
      console.error('[MemberUpgrade] 购买失败:', error)
      ElMessage.error('购买失败，请稍后重试')
    } finally {
      purchasing.value = false
    }
  }
</script>

<style scoped lang="scss">
  .member-upgrade-dialog {
    :deep(.el-dialog__body) {
      padding: 0;
    }

    :deep(.el-dialog__header) {
      padding: 0;
      margin: 0;
    }
  }

  .secondary-header {
    display: flex;
    align-items: center;
    padding: 16px 24px;
    border-bottom: 1px solid #e4e7ed;
    background: white;

    .back-button {
      margin-right: 12px;
      font-size: 14px;
    }

    .header-title {
      font-size: 16px;
      font-weight: 600;
      color: #303133;
    }
  }

  .upgrade-content {
    max-height: 60vh;
    overflow-y: auto;
  }

  .main-view,
  .benefits-view,
  .details-view,
  .help-view {
    min-height: 400px;
  }

  .upgrade-header {
    text-align: center;
    padding: 32px 24px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .header-icon {
    margin-bottom: 16px;
  }

  .crown-icon {
    color: #ffd700;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
  }

  .header-title {
    font-size: 24px;
    font-weight: 600;
    margin-bottom: 8px;
  }

  .header-subtitle {
    font-size: 14px;
    opacity: 0.9;
  }

  .plan-selector {
    display: flex;
    gap: 16px;
    padding: 24px;
    background: #f5f7fa;
  }

  .plan-card {
    flex: 1;
    padding: 20px;
    background: white;
    border: 2px solid #e4e7ed;
    border-radius: 12px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;

    &:hover {
      border-color: var(--el-color-primary-light-3);
      transform: translateY(-2px);
    }

    &.active {
      border-color: var(--el-color-primary);
      box-shadow: 0 4px 12px rgba(var(--el-color-primary-rgb), 0.2);
    }

    &.recommended {
      border-color: var(--el-color-primary);
    }
  }

  .plan-badge {
    position: absolute;
    top: -10px;
    right: -10px;
    background: var(--el-color-primary);
    color: white;
    font-size: 12px;
    padding: 4px 12px;
    border-radius: 12px;
  }

  .plan-name {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
    margin-bottom: 12px;
  }

  .plan-price {
    margin-bottom: 4px;
  }

  .price-currency {
    font-size: 14px;
    color: #303133;
  }

  .price-amount {
    font-size: 32px;
    font-weight: 700;
    color: var(--el-color-primary);
  }

  .price-unit {
    font-size: 14px;
    color: #909399;
  }

  .plan-original-price {
    font-size: 12px;
    color: #909399;
    text-decoration: line-through;
    margin-bottom: 8px;
  }

  .plan-description {
    font-size: 12px;
    color: #606266;
  }

  .benefits-section {
    padding: 24px;
  }

  .benefits-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .benefits-title,
  .section-title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
    margin-bottom: 16px;
  }

  .benefits-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .benefit-card {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
    background: #f5f7fa;
    border-radius: 8px;
  }

  .benefit-icon {
    color: var(--el-color-primary);
    flex-shrink: 0;
  }

  .benefit-title {
    font-size: 14px;
    font-weight: 500;
    color: #303133;
    margin-bottom: 4px;
  }

  .benefit-desc {
    font-size: 12px;
    color: #909399;
  }

  .quick-actions {
    display: flex;
    gap: 12px;
    padding: 0 24px 24px;
  }

  .action-button {
    flex: 1;
    height: 48px;
    font-size: 14px;
    border: 1px solid #e4e7ed;
    background: white;

    &:hover {
      border-color: var(--el-color-primary);
      color: var(--el-color-primary);
    }
  }

  // 全部权益视图
  .benefits-view {
    padding: 24px;
  }

  .benefits-grid-full {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
    margin-bottom: 32px;
  }

  .benefit-card-full {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    padding: 20px;
    background: #f5f7fa;
    border-radius: 12px;
    transition: all 0.3s ease;

    &:hover {
      background: #eef1f6;
      transform: translateY(-2px);
    }
  }

  .comparison-section {
    padding: 0 24px 24px;
  }

  .comparison-table {
    border-radius: 8px;
    overflow: hidden;
  }

  // 购买详情视图
  .details-view {
    padding: 24px;
  }

  .order-summary {
    margin-bottom: 24px;
  }

  .summary-card {
    background: #f5f7fa;
    border-radius: 12px;
    padding: 20px;
  }

  .summary-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid #e4e7ed;

    &:last-child {
      border-bottom: none;
    }

    &.discount {
      color: var(--el-color-success);
    }

    &.total {
      padding-top: 16px;
      margin-top: 8px;
      border-top: 2px solid #dcdfe6;
      font-size: 16px;
      font-weight: 600;
    }

    .label {
      color: #606266;
    }

    .value {
      font-weight: 500;
      color: #303133;
    }

    .price-highlight {
      font-size: 24px;
      color: var(--el-color-primary);
    }
  }

  .payment-methods {
    margin-bottom: 24px;
  }

  .payment-options {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .payment-option {
    width: 100%;
    height: auto;
    padding: 16px;
    border: 2px solid #e4e7ed;
    border-radius: 8px;
    transition: all 0.3s ease;

    &:hover {
      border-color: var(--el-color-primary-light-3);
    }

    :deep(.el-radio__input.is-checked + .el-radio__label) {
      color: var(--el-color-primary);
    }
  }

  .payment-content {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .payment-icon {
    &.wechat {
      color: #09bb07;
    }

    &.alipay {
      color: #1677ff;
    }
  }

  .payment-action {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    background: #f5f7fa;
    border-radius: 12px;
  }

  .total-display {
    .total-label {
      font-size: 14px;
      color: #606266;
    }

    .total-amount {
      font-size: 24px;
      font-weight: 700;
      color: var(--el-color-primary);
      margin-left: 8px;
    }
  }

  .pay-button {
    min-width: 160px;
  }

  // 帮助中心视图
  .help-view {
    padding: 24px;
  }

  .help-section {
    margin-bottom: 32px;
  }

  .faq-collapse {
    border: none;

    :deep(.el-collapse-item) {
      margin-bottom: 12px;
      border: 1px solid #e4e7ed;
      border-radius: 8px;
      overflow: hidden;
    }

    :deep(.el-collapse-item__header) {
      padding: 16px;
      background: white;
      border: none;
    }

    :deep(.el-collapse-item__wrap) {
      border: none;
    }

    :deep(.el-collapse-item__content) {
      padding: 16px;
      background: #f5f7fa;
    }
  }

  .faq-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 500;
    color: #303133;
  }

  .faq-answer {
    font-size: 14px;
    line-height: 1.6;
    color: #606266;
  }

  .customer-service {
    margin-bottom: 32px;
  }

  .service-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 32px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 12px;
    color: white;
    text-align: center;
  }

  .service-icon {
    margin-bottom: 16px;
    color: #ffd700;
  }

  .service-text {
    margin-bottom: 20px;
    font-size: 14px;
    opacity: 0.9;
  }

  .policies {
    .section-title {
      margin-bottom: 16px;
    }
  }

  .policy-links {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 16px;
    background: #f5f7fa;
    border-radius: 8px;

    .el-button {
      justify-content: flex-start;
    }
  }

  .dialog-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 24px;
    border-top: 1px solid #e4e7ed;
  }

  .footer-info {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: #909399;
  }

  .info-icon {
    color: #909399;
  }

  .footer-actions {
    display: flex;
    gap: 12px;
  }

  .text-primary {
    color: var(--el-color-primary);
  }

  .text-green-500 {
    color: #10b981;
  }

  .text-gray-300 {
    color: #d1d5db;
  }
</style>
