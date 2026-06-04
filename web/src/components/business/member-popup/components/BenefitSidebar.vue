<template>
  <div class="flex h-full w-[220px] flex-col border-r border-gray-50 bg-white p-5">
    <div class="mb-5">
      <h2 class="text-[18px] font-extrabold text-[#333] tracking-tight">69项权益无限用</h2>
      <p class="mt-1.5 text-[11px] font-medium text-gray-400 tracking-wide">电脑/手机/平板通用</p>
    </div>

    <div class="flex-1 space-y-5 overflow-y-auto pr-1 custom-scrollbar">
      <div v-for="benefit in benefits" :key="benefit.id" class="flex items-start group">
        <!-- Icon -->
        <div
          class="mr-3 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[8px] bg-[#EEF4FF] text-[#2B85E4] transition-colors group-hover:bg-[#2B85E4] group-hover:text-white"
        >
          <el-icon :size="18">
            <component :is="getIcon(benefit.icon)" />
          </el-icon>
        </div>
        <!-- Text -->
        <div class="pt-0.5">
          <h3 class="text-[13px] font-bold text-[#333] mb-0.5 leading-tight">{{
            benefit.title
          }}</h3>
          <p class="text-[10px] text-gray-400 font-medium scale-95 origin-left">{{
            benefit.description
          }}</p>
        </div>
      </div>
    </div>

    <div class="mt-auto pt-4 border-t border-gray-50">
      <a
        href="#"
        class="flex items-center text-[11px] font-medium text-gray-400 hover:text-[#2B85E4] transition-colors"
        @click.prevent="openBenefitComparison"
      >
        查看全部权益
        <el-icon class="ml-1 text-[10px]"><ArrowRight /></el-icon>
      </a>
    </div>
  </div>

  <!-- Benefit Comparison Dialog/Drawer Logic (Placeholder) -->
  <!-- Assuming we might want to overlay a comparison view or navigate -->
</template>

<script setup lang="ts">
  import type { Benefit } from '../composables/useMemberPopup'
  import { Cloudy, Top, Document, Picture, ArrowRight } from '@element-plus/icons-vue'

  defineProps<{
    benefits: Benefit[]
  }>()

  // Simple mock function to handle "View All Benefits" click
  // In a real scenario, this might emit an event to the parent to show a different view within the popup
  const emit = defineEmits(['view-all-benefits'])

  const openBenefitComparison = () => {
    emit('view-all-benefits')
  }

  const getIcon = (name: string) => {
    switch (name) {
      case 'cloud':
        return Cloudy
      case 'upload':
        return Top
      case 'convert':
        return Document
      case 'extract':
        return Picture
      default:
        return Cloudy
    }
  }
</script>

<style scoped>
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }

  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: #f1f1f1;
    border-radius: 4px;
  }

  .custom-scrollbar:hover::-webkit-scrollbar-thumb {
    background-color: #e5e7eb;
  }
</style>
