<!-- 布局容器 -->
<template>
  <div class="app-layout" :class="{ 'portal-layout': isPortalRoute }">
    <aside id="app-sidebar">
      <ArtSidebarMenu />
    </aside>

    <main id="app-main">
      <div id="app-header">
        <ArtHeaderBar />
      </div>
      <div id="app-content">
        <ArtPageContent />
      </div>
      <div id="app-footer">
        <ArtFooter />
      </div>
    </main>

    <div id="app-global">
      <ArtGlobalComponent />
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { useRoute } from 'vue-router'
  import { storeToRefs } from 'pinia'
  import { useSettingStore } from '@/store/modules/setting'

  defineOptions({ name: 'AppLayout' })

  const route = useRoute()
  const settingStore = useSettingStore()
  const { getMenuOpenWidth, menuOpen } = storeToRefs(settingStore)

  // 检测是否为前台(Portal)路由 - 不以 /admin 开头的路由
  const isPortalRoute = computed(() => {
    return !route.path.startsWith('/admin')
  })

  // 侧边栏宽度
  const sidebarWidth = computed(() => {
    return menuOpen.value ? getMenuOpenWidth.value : '64px'
  })
</script>

<style lang="scss" scoped>
  @use './style';
</style>

<style scoped>
  /* 所有布局动态宽度 */
  .app-layout #app-main {
    margin-left: v-bind(sidebarWidth);
    width: calc(100% - v-bind(sidebarWidth));
    transition:
      margin-left 0.3s ease,
      width 0.3s ease;
  }
</style>
