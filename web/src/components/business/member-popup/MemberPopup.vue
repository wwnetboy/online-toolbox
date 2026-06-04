<template>
  <el-dialog
    v-model="isVisible"
    class="member-popup-dialog-v2"
    width="860px"
    align-center
    append-to-body
    :close-on-click-modal="true"
    :before-close="handleClose"
  >
    <div class="relative flex h-[520px] w-full flex-col bg-[#FDFDFD] overflow-hidden">
      <!-- Close Button Removed (Using standard dialog header) -->

      <!-- Header: User Info & Links -->
      <div class="flex items-center justify-between px-5 pt-4 pb-0 flex-shrink-0">
        <div class="flex items-center">
          <div
            class="mr-2.5 h-8 w-8 overflow-hidden rounded-full border border-gray-100 bg-gray-50"
          >
            <img :src="avatar" alt="Avatar" class="h-full w-full object-cover" />
          </div>
          <span class="text-[14px] font-bold text-[#333]">{{ username }}</span>
        </div>
        <div class="flex items-center space-x-5 text-[12px] text-gray-400 mr-1">
          <a href="#" class="hover:text-[#333] transition-colors">购买明细</a>
          <a href="#" class="hover:text-[#333] transition-colors">帮助中心</a>
          <button type="button" class="sr-only" aria-label="Close" @click="handleClose">
            Close
          </button>
        </div>
      </div>

      <!-- Content Area -->
      <div class="flex flex-1 overflow-hidden p-5" v-if="!showBenefitComparison">
        <!-- Left: Benefits (Card style) -->
        <div
          class="flex-shrink-0 w-[220px] rounded-[12px] bg-white shadow-[0_2px_8px_0_rgba(0,0,0,0.02)] border border-gray-100 overflow-hidden flex flex-col relative z-10"
        >
          <BenefitSidebar :benefits="benefits" @view-all-benefits="handleViewAllBenefits" />
        </div>

        <!-- Right: Plans & Payment -->
        <div class="flex-1 pl-5 flex flex-col min-w-0 relative">
          <!-- Default View: Plans Selection -->
          <div class="flex flex-col h-full">
            <!-- Tabs -->
            <div class="flex items-center justify-center space-x-10 mb-3 flex-shrink-0">
              <button
                class="flex flex-col items-center justify-center group"
                @click="setTab('vip')"
              >
                <div
                  class="flex items-center text-[16px] font-bold transition-colors duration-200"
                  :class="
                    activeTab === 'vip' ? 'text-[#333]' : 'text-gray-300 group-hover:text-gray-400'
                  "
                >
                  <div
                    class="mr-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white shadow-sm transition-colors duration-200"
                    :class="
                      activeTab === 'vip' ? 'bg-[#FFD700]' : 'bg-gray-300 group-hover:bg-gray-400'
                    "
                    >V</div
                  >
                  工具VIP
                </div>
                <div
                  class="mt-1 h-[3px] w-4 rounded-full transition-colors duration-200"
                  :class="activeTab === 'vip' ? 'bg-[#FFD700]' : 'bg-transparent'"
                ></div>
              </button>

              <button
                class="flex flex-col items-center justify-center group"
                @click="setTab('svip')"
              >
                <div
                  class="flex items-center text-[16px] font-bold transition-colors duration-200"
                  :class="
                    activeTab === 'svip' ? 'text-[#333]' : 'text-gray-300 group-hover:text-gray-400'
                  "
                >
                  <div
                    class="mr-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white shadow-sm transition-colors duration-200"
                    :class="
                      activeTab === 'svip' ? 'bg-[#A0AEC0]' : 'bg-gray-300 group-hover:bg-gray-400'
                    "
                    >S</div
                  >
                  工具SVIP
                  <span
                    class="ml-1.5 text-[11px] font-normal transition-colors duration-200"
                    :class="activeTab === 'svip' ? 'text-gray-400' : 'text-gray-300'"
                    >1T大空间/100G大文件上传</span
                  >
                </div>
                <div
                  class="mt-1 h-[3px] w-4 rounded-full transition-colors duration-200"
                  :class="activeTab === 'svip' ? 'bg-[#A0AEC0]' : 'bg-transparent'"
                ></div>
              </button>
            </div>

            <div class="flex-1 min-h-0">
              <PlanSelection
                :plans="plans"
                :selected-plan-id="selectedPlanId"
                :is-agreement-checked="isAgreementChecked"
                @select-plan="selectedPlanId = $event"
                @update:isAgreementChecked="isAgreementChecked = $event"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Comparison View: Full Overlay -->
      <div
        v-else
        class="flex flex-col h-full bg-[#FDFDFD] p-5 animate-fade-in-right absolute inset-0 z-20"
      >
        <!-- Back Header -->
        <div
          class="flex items-center mb-4 cursor-pointer text-gray-500 hover:text-[#333] transition-colors flex-shrink-0"
          @click="showBenefitComparison = false"
        >
          <el-icon class="mr-1"><ArrowLeft /></el-icon>
          <span class="text-sm font-bold">返回</span>
        </div>

        <!-- Comparison Table Container -->
        <div
          class="flex-1 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm flex flex-col"
        >
          <!-- Table Header -->
          <div
            class="grid grid-cols-4 border-b border-gray-100 bg-[#FAFAFA] py-3 text-xs font-medium text-gray-500"
          >
            <div class="pl-6 font-bold text-gray-700">权益</div>
            <div class="text-center">普通用户</div>
            <div class="text-center font-bold text-[#FFD700] flex items-center justify-center">
              <div
                class="mr-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#FFD700] text-[8px] font-bold text-white"
                >V</div
              >
              VIP
            </div>
            <div class="text-center font-bold text-[#A0AEC0] flex items-center justify-center">
              <div
                class="mr-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#A0AEC0] text-[8px] font-bold text-white"
                >S</div
              >
              SVIP
            </div>
          </div>

          <!-- Table Body (Scrollable) -->
          <div class="flex-1 overflow-y-auto custom-scrollbar p-0">
            <!-- Section 1 -->
            <div
              class="bg-gray-50 px-6 py-2 text-xs font-bold text-gray-800 border-b border-gray-100 mt-0 flex items-center"
            >
              网盘权益 · 3项
            </div>
            <div
              class="grid grid-cols-4 py-3 text-xs border-b border-gray-50 hover:bg-gray-50 transition-colors items-center"
            >
              <div class="pl-6 text-gray-600 flex items-center"
                >回收站有效期 <el-icon class="ml-1 text-gray-300" size="10"><InfoFilled /></el-icon
              ></div>
              <div class="text-center text-gray-400">10天</div>
              <div class="text-center font-medium text-gray-800">30天</div>
              <div class="text-center font-medium text-gray-800">30天</div>
            </div>
            <div
              class="grid grid-cols-4 py-3 text-xs border-b border-gray-50 hover:bg-gray-50 transition-colors items-center"
            >
              <div class="pl-6 text-gray-600">云空间容量</div>
              <div class="text-center text-gray-400">1GB</div>
              <div class="text-center font-medium text-gray-800">100GB</div>
              <div class="text-center font-bold text-[#A0AEC0]"
                >1T <span class="text-[10px] align-top text-[#FF6A00]">⬆</span></div
              >
            </div>
            <div
              class="grid grid-cols-4 py-3 text-xs border-b border-gray-100 hover:bg-gray-50 transition-colors items-center"
            >
              <div class="pl-6 text-gray-600">大文件上传</div>
              <div class="text-center text-gray-400">最大1GB</div>
              <div class="text-center font-medium text-gray-800">最大10GB</div>
              <div class="text-center font-bold text-[#A0AEC0]"
                >最大100GB <span class="text-[10px] align-top text-[#FF6A00]">⬆</span></div
              >
            </div>

            <!-- Section 2 -->
            <div
              class="bg-gray-50 px-6 py-2 text-xs font-bold text-gray-800 border-b border-gray-100 flex items-center"
            >
              文档权益 · 41项
              <el-icon class="ml-1" size="10"><CaretBottom /></el-icon>
            </div>
            <div
              class="grid grid-cols-4 py-3 text-xs border-b border-gray-50 hover:bg-gray-50 transition-colors items-center"
            >
              <div class="pl-6 text-gray-600">PDF合并</div>
              <div class="text-center text-gray-400">-</div>
              <div class="text-center text-[#FFD700]"
                ><el-icon><Check /></el-icon
              ></div>
              <div class="text-center text-[#A0AEC0]"
                ><el-icon><Check /></el-icon
              ></div>
            </div>
            <div
              class="grid grid-cols-4 py-3 text-xs border-b border-gray-50 hover:bg-gray-50 transition-colors items-center"
            >
              <div class="pl-6 text-gray-600 flex items-center"
                >Word删除水印 <el-icon class="ml-1 text-gray-300" size="10"><InfoFilled /></el-icon
              ></div>
              <div class="text-center text-gray-400">-</div>
              <div class="text-center text-[#FFD700]"
                ><el-icon><Check /></el-icon
              ></div>
              <div class="text-center text-[#A0AEC0]"
                ><el-icon><Check /></el-icon
              ></div>
            </div>
            <div
              class="grid grid-cols-4 py-3 text-xs border-b border-gray-50 hover:bg-gray-50 transition-colors items-center"
            >
              <div class="pl-6 text-gray-600">PDF转长图</div>
              <div class="text-center text-gray-400">标清</div>
              <div class="text-center text-gray-800">高清</div>
              <div class="text-center text-gray-800">高清</div>
            </div>
            <!-- More rows placeholder... -->
          </div>

          <!-- Sticky Footer Action -->
          <div class="absolute bottom-5 left-0 right-0 flex justify-center pointer-events-none">
            <button
              class="pointer-events-auto w-[200px] rounded-full bg-[#222] py-2.5 text-[13px] font-bold text-[#FFD700] shadow-lg hover:bg-black transition-colors transform hover:-translate-y-0.5 active:translate-y-0"
              @click="showBenefitComparison = false"
            >
              立即开通
            </button>
          </div>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { useMemberPopup } from './composables/useMemberPopup'
  import BenefitSidebar from './components/BenefitSidebar.vue'
  import PlanSelection from './components/PlanSelection.vue'
  import { useUserStore } from '@/store/modules/user'
  import { ArrowLeft, Check, CaretBottom, InfoFilled } from '@element-plus/icons-vue'

  const userStore = useUserStore()
  const userInfo = computed(() => userStore.getUserInfo)
  const username = computed(() => userInfo.value.username || userInfo.value.realName || '望北川')
  const avatar = computed(
    () => userInfo.value.avatar || 'https://ui-avatars.com/api/?name=User&background=random'
  )

  const showBenefitComparison = ref(false)

  const handleViewAllBenefits = () => {
    showBenefitComparison.value = true
  }

  const {
    isVisible,
    activeTab,
    plans,
    selectedPlanId,
    benefits,
    isAgreementChecked,
    open,
    close,
    setTab
  } = useMemberPopup()

  const handleClose = () => {
    showBenefitComparison.value = false
    close()
  }

  defineExpose({
    open,
    close
  })
</script>

<style>
  /* Scoped to member-popup-dialog-v2 to affect only this dialog */

  .member-popup-dialog-v2 .el-dialog__header {
    position: absolute;
    top: 0;
    right: 0;
    z-index: 100;
    display: block !important;
    width: auto;
    padding: 0 !important;
    margin: 0 !important;
    background: transparent;
  }

  .member-popup-dialog-v2 .el-dialog__headerbtn {
    top: 15px !important;
    right: 15px !important;
    font-size: 20px !important;
  }

  .member-popup-dialog-v2 {
    background: white !important;
  }

  .member-popup-dialog-v2 .el-dialog__body {
    padding: 0 !important;
  }

  /* Animation for comparison view */
  @keyframes fadeInRight {
    from {
      opacity: 0;
      transform: translateX(20px);
    }

    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .animate-fade-in-right {
    animation: fadeInRight 0.3s ease-out;
  }

  /* Custom Scrollbar for comparison table */
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
