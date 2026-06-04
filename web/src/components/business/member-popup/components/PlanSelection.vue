<template>
  <div class="flex flex-1 flex-col bg-[#FDFDFD] px-4 pt-2 pb-4">
    <!-- Plans Grid -->
    <div class="mb-6 grid grid-cols-3 gap-4">
      <div
        v-for="plan in plans"
        :key="plan.id"
        class="plan-card relative flex cursor-pointer flex-col items-center justify-center rounded-[12px] border py-6 transition-all duration-200"
        :class="
          selectedPlanId === plan.id
            ? 'active-card border-[#FFD086] bg-gradient-to-b from-[#FFF0D4] to-[#FFFCF9] shadow-[0_4px_12px_-4px_rgba(255,208,134,0.4)]'
            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
        "
        @click="$emit('select-plan', plan.id)"
      >
        <!-- Tag -->
        <div
          v-if="plan.tag"
          class="absolute -top-[1px] -left-[1px] rounded-br-[10px] rounded-tl-[10px] px-2 py-0.5 text-[10px] font-bold text-white z-10"
          :class="plan.tag === '5折特惠' ? 'bg-[#FF4D4F]' : 'bg-[#FF6A00]'"
        >
          {{ plan.tag }}
        </div>

        <!-- Duration -->
        <div
          class="mb-2 text-[15px] font-bold transition-colors"
          :class="selectedPlanId === plan.id ? 'text-[#5D4018]' : 'text-[#333]'"
        >
          {{ plan.name }}
        </div>

        <!-- Price -->
        <div
          class="mb-1 flex items-baseline leading-none transition-colors"
          :class="selectedPlanId === plan.id ? 'text-[#5D4018]' : 'text-[#333]'"
        >
          <span class="text-[14px] font-bold mr-0.5">{{ plan.currency }}</span>
          <span class="text-[36px] font-bold font-din tracking-tight">{{ plan.price }}</span>
        </div>

        <!-- Subtext -->
        <div class="flex flex-col items-center space-y-0.5 transition-colors">
          <div
            class="text-[12px] line-through decoration-gray-300"
            :class="selectedPlanId === plan.id ? 'text-[#8C6D45] opacity-70' : 'text-gray-400'"
            v-if="plan.originalPrice > plan.price"
          >
            {{ plan.currency }}{{ plan.originalPrice }}/{{
              plan.subText?.includes('年') ? '年' : '月'
            }}
          </div>
          <div
            class="text-[12px]"
            :class="selectedPlanId === plan.id ? 'text-[#8C6D45]' : 'text-[#666]'"
            v-if="plan.subText && !plan.originalPrice"
          >
            {{ plan.subText }}
          </div>
        </div>

        <!-- Footer Text (e.g. daily price) -->
        <div
          class="mt-2 rounded-[4px] bg-[#F5F7FA] px-2 py-0.5 text-[10px] font-medium text-gray-400"
          v-if="plan.footerText"
        >
          {{ plan.footerText }}
        </div>
      </div>
    </div>

    <!-- Spacer to push payment to bottom -->
    <div class="flex-1"></div>

    <!-- Discount Banner -->
    <div
      class="mb-4 flex items-center justify-between rounded-lg bg-[#FFF7E6] px-3 py-2 text-xs font-medium text-[#FA8C16] border border-[#FFE7BA]"
      v-if="savings > 0"
    >
      <div class="flex items-center">
        <span
          class="mr-2 flex h-3.5 w-3.5 items-center justify-center rounded-[2px] bg-[#FA8C16] text-[9px] text-white"
          >券</span
        >
        <span class="tracking-wide">工具权益卡优惠券 已减{{ savingsCurrency }}{{ savings }}</span>
      </div>
      <span class="text-[#FFC069] scale-90 origin-right">6天04:14:39后失效</span>
    </div>

    <!-- Payment Footer -->
    <div class="flex items-end justify-between pt-2">
      <!-- QR Code -->
      <div
        class="relative h-28 w-28 flex-shrink-0 overflow-hidden rounded-[8px] border border-gray-100 bg-white p-1 shadow-sm"
      >
        <!-- Mock QR -->
        <img
          src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=ExamplePayment"
          alt="QR"
          class="h-full w-full opacity-90"
        />

        <!-- Mask if not checked -->
        <div
          v-if="!isAgreementChecked"
          class="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/95 backdrop-blur-[1px] text-center p-2"
        >
          <p class="text-[10px] font-medium text-gray-600 mb-2 leading-tight"
            >请先阅读并同意<br />相关协议</p
          >
          <button
            class="rounded-[4px] bg-[#2B85E4] px-3 py-1 text-[10px] font-bold text-white hover:bg-blue-600 transition-colors shadow-sm"
            @click="$emit('update:isAgreementChecked', true)"
          >
            同意协议
          </button>
        </div>
        <div
          class="absolute bottom-0 w-full text-center text-[9px] text-gray-400 bg-white/80 py-0.5"
          >微信扫码 支付</div
        >
      </div>

      <!-- Price & Agreement -->
      <div class="ml-6 flex flex-1 flex-col items-start justify-end h-28 pb-1">
        <div class="mb-1 flex items-baseline">
          <span class="text-[14px] text-gray-500 mr-2">微信扫码 支付</span>
          <span class="text-[18px] font-bold text-[#333] mr-0.5">¥</span>
          <span class="text-[40px] font-bold text-[#333] font-din leading-none -mb-1">{{
            selectedPlan?.price
          }}</span>
          <span class="ml-2 text-[14px] text-gray-300 line-through font-din"
            >¥{{ selectedPlan?.originalPrice }}</span
          >
        </div>

        <div class="flex items-start mt-2 select-none">
          <div
            class="relative flex h-3.5 w-3.5 flex-shrink-0 cursor-pointer items-center justify-center rounded-[4px] border transition-all duration-200 mr-1.5 mt-0.5"
            :class="
              isAgreementChecked
                ? 'border-[#2B85E4] bg-[#2B85E4]'
                : 'border-gray-300 bg-white hover:border-gray-400'
            "
            @click="$emit('update:isAgreementChecked', !isAgreementChecked)"
          >
            <svg
              v-if="isAgreementChecked"
              xmlns="http://www.w3.org/2000/svg"
              class="h-2.5 w-2.5 text-white"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
          <div class="text-[11px] text-gray-400 leading-tight">
            开通会员前阅读并同意
            <a href="#" class="text-gray-500 hover:text-[#2B85E4] hover:underline transition-colors"
              >《工具会员协议》</a
            >
            <a href="#" class="text-gray-500 hover:text-[#2B85E4] hover:underline transition-colors"
              >《权益自动续费规则》</a
            >
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import type { Plan } from '../composables/useMemberPopup'

  const props = defineProps<{
    plans: Plan[]
    selectedPlanId: string
    isAgreementChecked: boolean
  }>()

  defineEmits<{
    (e: 'select-plan', id: string): void
    (e: 'update:isAgreementChecked', val: boolean): void
  }>()

  const selectedPlan = computed(() => props.plans.find((p) => p.id === props.selectedPlanId))

  const savings = computed(() => {
    if (!selectedPlan.value) return 0
    return (selectedPlan.value.originalPrice - selectedPlan.value.price).toFixed(2)
  })

  const savingsCurrency = computed(() => selectedPlan.value?.currency || '¥')
</script>

<style scoped>
  .font-din {
    font-family: 'DIN Alternate', Roboto, 'Helvetica Neue', Helvetica, Arial, sans-serif;
  }
</style>
