import { ref, computed } from 'vue'

export interface Plan {
  id: string
  name: string
  price: number
  originalPrice: number
  currency: string
  tag?: string
  subText?: string
  footerText?: string
  type: 'subscription' | 'fixed'
}

export interface Benefit {
  id: string
  title: string
  description: string
  icon: string // Iconify icon name or svg path
}

export function useMemberPopup() {
  const isVisible = ref(false)
  const activeTab = ref<'vip' | 'svip'>('vip')
  const selectedPlanId = ref('')
  const isAgreementChecked = ref(false)

  // VIP Plans
  const vipPlans: Plan[] = [
    {
      id: 'vip_monthly_sub',
      name: '连续包月首月',
      price: 2.99,
      originalPrice: 20,
      currency: '¥',
      tag: '新用户专享',
      subText: '次月起6元',
      type: 'subscription'
    },
    {
      id: 'vip_yearly',
      name: '1年',
      price: 60,
      originalPrice: 120,
      currency: '¥',
      tag: '5折特惠',
      subText: '¥120元/年',
      footerText: '折算后0.16元/天',
      type: 'fixed'
    },
    {
      id: 'vip_monthly',
      name: '1个月',
      price: 8,
      originalPrice: 10,
      currency: '¥',
      subText: '10元/月',
      type: 'fixed'
    }
  ]

  // SVIP Plans (Mock data)
  const svipPlans: Plan[] = [
    {
      id: 'svip_monthly_sub',
      name: '连续包月首月',
      price: 12.9,
      originalPrice: 30,
      currency: '¥',
      tag: '新用户专享',
      subText: '次月起18元',
      type: 'subscription'
    },
    {
      id: 'svip_yearly',
      name: '1年',
      price: 168,
      originalPrice: 298,
      currency: '¥',
      tag: '5折特惠',
      subText: '¥298元/年',
      footerText: '折算后0.46元/天',
      type: 'fixed'
    },
    {
      id: 'svip_monthly',
      name: '1个月',
      price: 18,
      originalPrice: 25,
      currency: '¥',
      subText: '25元/月',
      type: 'fixed'
    }
  ]

  const currentPlans = computed(() => (activeTab.value === 'vip' ? vipPlans : svipPlans))

  // Initialize selected plan
  const init = () => {
    selectedPlanId.value = vipPlans[0].id
  }
  init()

  const selectedPlan = computed(
    () => currentPlans.value.find((p) => p.id === selectedPlanId.value) || currentPlans.value[0]
  )

  const benefits: Benefit[] = [
    {
      id: 'storage',
      title: '100G 云盘空间',
      description: '低价扩容100G空间',
      icon: 'cloud'
    },
    {
      id: 'speed',
      title: '10G 上传文件速度',
      description: '10G上传下载不限速',
      icon: 'upload'
    },
    {
      id: 'convert',
      title: 'PDF转Office',
      description: '文档格式无损转换',
      icon: 'convert'
    },
    {
      id: 'extract',
      title: '文档内容提取',
      description: '提取文档页面/图片/表格',
      icon: 'extract'
    }
  ]

  const open = () => {
    isVisible.value = true
  }

  const close = () => {
    isVisible.value = false
  }

  const setTab = (tab: 'vip' | 'svip') => {
    activeTab.value = tab
    // Reset selection to first plan of new tab
    selectedPlanId.value = tab === 'vip' ? vipPlans[0].id : svipPlans[0].id
  }

  return {
    isVisible,
    activeTab,
    selectedPlanId,
    selectedPlan,
    plans: currentPlans,
    benefits,
    isAgreementChecked,
    open,
    close,
    setTab
  }
}
