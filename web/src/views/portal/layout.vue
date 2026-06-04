<!-- 前台布局容器 - 简化版，无需登录 -->
<template>
  <div class="portal-layout">
    <!-- 顶部导航 -->
    <header class="portal-header">
      <div class="header-content">
        <div class="logo-area" @click="goHome">
          <img src="@/assets/images/common/logo.webp" alt="Logo" class="logo" />
          <span class="site-name">在线工具箱</span>
        </div>

        <nav class="nav-menu">
          <router-link
            v-for="item in menuItems"
            :key="item.path"
            :to="item.path"
            class="nav-item"
            :class="{ active: isActive(item.path) }"
          >
            <ArtSvgIcon :icon="item.icon" class="nav-icon" />
            <span>{{ item.title }}</span>
          </router-link>
        </nav>

        <div class="header-actions">
          <ElButton @click="goHistory" class="history-btn">
            <ArtSvgIcon icon="ri:history-line" class="mr-1" />
            <span>历史记录</span>
          </ElButton>
          <ElButton type="primary" @click="goAdmin">
            <ElIcon class="mr-1"><Setting /></ElIcon>
            <span>管理后台</span>
          </ElButton>
        </div>
      </div>
    </header>

    <!-- 主内容区 -->
    <main class="portal-main">
      <div class="main-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </main>

    <!-- 页脚 -->
    <footer class="portal-footer">
      <div class="footer-content">
        <p>© {{ currentYear }} 在线工具箱 - 所有处理均在本地完成，保护您的隐私</p>
      </div>
    </footer>

    <!-- 浮动按钮 -->
    <ArtPortalFloat />
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted } from 'vue'
  import { useRouter, useRoute } from 'vue-router'
  import { Setting } from '@element-plus/icons-vue'
  import { useToolsStore } from '@/store/modules/toolbox'
  import ArtPortalFloat from '@/components/core/layouts/art-portal-float/index.vue'

  defineOptions({ name: 'PortalLayout' })

  const router = useRouter()
  const route = useRoute()
  const toolsStore = useToolsStore()

  const currentYear = new Date().getFullYear()

  // 初始化工具数据
  onMounted(async () => {
    await toolsStore.initTools()
  })

  // 导航菜单项 - 从 store 动态获取启用的分类
  const menuItems = computed(() => {
    const items = [{ path: '/', title: '所有工具', icon: 'ri:apps-line' }]

    // 从 store 获取启用的分类，并转换为菜单项
    toolsStore.enabledCategories.forEach((category) => {
      // 只显示有工具的分类
      if (toolsStore.getToolsByCategory(category.id).length > 0) {
        items.push({
          path: `/${category.id}`,
          title: category.name,
          icon: category.icon
        })
      }
    })

    return items
  })

  const isActive = (path: string) => {
    if (path === '/') {
      return route.path === '/' || route.path === '/index'
    }
    return route.path.startsWith(path)
  }

  const goHome = () => {
    router.push('/')
  }

  const goHistory = () => {
    router.push('/history')
  }

  const goAdmin = () => {
    router.push('/admin/login')
  }
</script>

<style lang="scss" scoped>
  .portal-layout {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--el-bg-color-page);
  }

  .portal-header {
    position: sticky;
    top: 0;
    z-index: 100;
    background: var(--el-bg-color);
    border-bottom: 1px solid var(--el-border-color-lighter);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  }

  .header-content {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 24px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .logo-area {
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;

    .logo {
      height: 32px;
      width: auto;
    }

    .site-name {
      font-size: 18px;
      font-weight: 600;
      color: var(--el-text-color-primary);
    }
  }

  .nav-menu {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 14px;
    color: var(--el-text-color-regular);
    text-decoration: none;
    transition: all 0.2s;

    &:hover {
      background: var(--el-fill-color-light);
      color: var(--el-color-primary);
    }

    &.active {
      background: var(--el-color-primary-light-9);
      color: var(--el-color-primary);
    }

    .nav-icon {
      font-size: 18px;
    }
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .portal-main {
    flex: 1;
    padding: 24px;
  }

  .main-content {
    max-width: 1400px;
    margin: 0 auto;
  }

  .portal-footer {
    background: var(--el-bg-color);
    border-top: 1px solid var(--el-border-color-lighter);
    padding: 20px 24px;
  }

  .footer-content {
    max-width: 1400px;
    margin: 0 auto;
    text-align: center;

    p {
      margin: 0;
      font-size: 13px;
      color: var(--el-text-color-secondary);
    }
  }

  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.2s ease;
  }

  .fade-enter-from,
  .fade-leave-to {
    opacity: 0;
  }

  /* 平板适配 */
  @media (max-width: 1024px) {
    .nav-menu {
      gap: 4px;
    }

    .nav-item {
      padding: 8px 12px;

      span {
        display: none;
      }

      .nav-icon {
        font-size: 20px;
      }
    }
  }

  /* 移动端适配 */
  @media (max-width: 768px) {
    .header-content {
      padding: 0 16px;
      height: 56px;
    }

    .logo-area .site-name {
      display: none;
    }

    .nav-item {
      padding: 8px;
    }

    .portal-main {
      padding: 16px;
    }

    .header-actions .el-button span {
      display: none;
    }
  }
</style>
