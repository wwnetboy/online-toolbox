<template>
  <div class="flex h-screen w-full flex-col items-center justify-center bg-gray-50">
    <div class="mb-8 text-center">
      <h1 class="text-2xl font-bold text-gray-800">会员弹窗组件演示</h1>
      <p class="text-gray-500">Member Popup Component Demo</p>
    </div>

    <div class="space-x-4">
      <button
        class="rounded bg-blue-600 px-6 py-2 text-white shadow hover:bg-blue-700 focus:outline-none"
        @click="openPopup"
      >
        打开会员弹窗
      </button>
    </div>

    <!-- The Popup Component -->
    <MemberPopup ref="popupRef" />
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import { MemberPopup } from '@/components/business/member-popup'

  // Since useMemberPopup provides state but the component inside handles it via the same composable or props,
  // in this architecture, the MemberPopup component likely uses the singleton state or a provided state.
  // Let's check how I implemented MemberPopup.vue.
  // Ah, it imports `useMemberPopup` directly and calls it.
  // Since `useMemberPopup` uses `ref` defined *inside* the function scope (it's not a singleton state store by default unless defined outside),
  // calling it here would create a *separate* state instance if I just call it again.
  // However, the `MemberPopup` component *also* calls `useMemberPopup`.
  // If I want to control it from outside, I should probably pass `isVisible` as a prop or expose a method.
  // But wait, my `useMemberPopup` implementation defined refs *inside* the function. So every call creates new state.
  // This means the `MemberPopup` has its own internal state.
  // To control it, I should use a ref on the component or change the architecture.
  // BUT, the `MemberPopup.vue` I wrote exposes nothing. It just uses the composable internally.
  // Wait, `MemberPopup.vue` template uses `isVisible` from `useMemberPopup()`.
  // Since I can't easily reach into the component instance to set that ref without `defineExpose`,
  // I should probably modify `MemberPopup.vue` to accept `modelValue` or `visible` prop, OR expose the `open` method.

  // Let's fix `MemberPopup.vue` to be more reusable first, or just use a shared state approach if I intended that.
  // Actually, looking at `useMemberPopup.ts`, the refs are inside the function.
  // So `MemberPopup.vue` has its own isolated state.
  // I need to trigger its `open` method.
  // I will assume I can use `ref` to access the component instance, but I need `defineExpose` in `MemberPopup.vue`.

  // Let's update `MemberPopup.vue` to expose `open` and `close`.

  const popupRef = ref()

  const openPopup = () => {
    popupRef.value?.open()
  }
</script>
