<!-- 用户菜单 -->
<template>
  <ElPopover
    ref="userMenuPopover"
    placement="bottom-end"
    :width="240"
    :hide-after="0"
    :offset="10"
    trigger="hover"
    :show-arrow="false"
    popper-class="user-menu-popover"
    popper-style="padding: 5px 16px;"
  >
    <template #reference>
      <img
        class="size-8.5 mr-5 c-p rounded-full max-sm:w-6.5 max-sm:h-6.5 max-sm:mr-[16px]"
        :src="userInfo.avatar || defaultAvatar"
        alt="avatar"
      />
    </template>
    <template #default>
      <!-- 未登录 -->
      <div v-if="!userStore.isLogin" class="pt-3 pb-1">
        <div class="flex-c pb-1 px-0">
          <img
            class="w-10 h-10 mr-3 ml-0 overflow-hidden rounded-full float-left"
            :src="defaultAvatar"
          />
          <div class="w-[calc(100%-60px)] h-full">
            <span class="block text-sm font-medium text-g-800">未登录</span>
            <span class="block mt-0.5 text-xs text-g-500">登录后享受更多功能</span>
          </div>
        </div>
        <div class="mt-2 pt-2 border-t border-g-300/80">
          <div class="log-out c-p" @click="goLogin">立即登录</div>
        </div>
      </div>
      <!-- 已登录 -->
      <div v-else class="pt-3">
        <div class="flex-c pb-1 px-0">
          <img
            class="w-10 h-10 mr-3 ml-0 overflow-hidden rounded-full float-left"
            :src="userInfo.avatar || defaultAvatar"
          />
          <div class="w-[calc(100%-60px)] h-full">
            <span class="block text-sm font-medium text-g-800 truncate">{{
              userInfo.userName
            }}</span>
            <span class="block mt-0.5 text-xs text-g-500 truncate">{{
              userInfo.nickName || userInfo.email
            }}</span>
          </div>
        </div>
        <ul class="py-4 mt-3 border-t border-g-300/80">
          <li class="btn-item" @click="goToUserCenter">
            <ArtSvgIcon icon="ri:user-3-line" />
            <span>{{ $t('topBar.user.userCenter') }}</span>
          </li>
          <li v-if="isAdmin" class="btn-item" @click="goPage('/admin/overview')">
            <ArtSvgIcon icon="ri:dashboard-line" />
            <span>管理后台</span>
          </li>
          <li class="btn-item" @click="lockScreen()">
            <ArtSvgIcon icon="ri:lock-line" />
            <span>{{ $t('topBar.user.lockScreen') }}</span>
          </li>
          <div class="w-full h-px my-2 bg-g-300/80"></div>
          <div class="log-out c-p" @click="loginOut">
            {{ $t('topBar.user.logout') }}
          </div>
        </ul>
      </div>
    </template>
  </ElPopover>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import { useRouter } from 'vue-router'
  import { ElMessageBox } from 'element-plus'
  import { useUserStore } from '@/store/modules/user'
  import { WEB_LINKS } from '@/utils/constants'
  import { mittBus } from '@/utils/sys'
  import defaultAvatarImg from '@/assets/images/avatar/login-default-avatar.png'

  defineOptions({ name: 'ArtUserMenu' })

  const router = useRouter()
  const { t } = useI18n()
  const userStore = useUserStore()

  const { getUserInfo: userInfo } = storeToRefs(userStore)
  const userMenuPopover = ref()
  const defaultAvatar = defaultAvatarImg

  /**
   * 判断是否是管理员
   */
  const isAdmin = computed(() => {
    const roles = userInfo.value?.roles || []
    return roles.includes('R_SUPER') || roles.includes('R_ADMIN')
  })

  /**
   * 页面跳转
   * @param {string} path - 目标路径
   */
  const goPage = (path: string): void => {
    router.push(path)
  }

  /**
   * 跳转到登录页
   */
  const goLogin = (): void => {
    closeUserMenu()
    const currentPath = router.currentRoute.value.path
    const isAdminRoute = currentPath.startsWith('/admin')
    router.push({ name: isAdminRoute ? 'AdminLogin' : 'Login', query: { redirect: currentPath } })
  }

  /**
   * 跳转到个人中心
   * 根据当前路径判断是在后台还是前台，跳转到对应的个人中心
   */
  const goToUserCenter = (): void => {
    const currentPath = router.currentRoute.value.path
    // 如果当前在后台（路径包含 /admin），则跳转到后台个人中心
    if (currentPath.startsWith('/admin')) {
      router.push('/admin/user-manage/center')
    } else {
      // 否则跳转到前台个人中心
      router.push('/user-center')
    }
  }

  /**
   * 打开文档页面
   */
  const toDocs = (): void => {
    window.open(WEB_LINKS.DOCS)
  }

  /**
   * 打开 GitHub 页面
   */
  const toGithub = (): void => {
    window.open(WEB_LINKS.GITHUB)
  }

  /**
   * 打开锁屏功能
   */
  const lockScreen = (): void => {
    mittBus.emit('openLockScreen')
  }

  /**
   * 用户登出确认
   */
  const loginOut = (): void => {
    closeUserMenu()
    setTimeout(() => {
      ElMessageBox.confirm(t('common.logOutTips'), t('common.tips'), {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        customClass: 'login-out-dialog'
      }).then(() => {
        userStore.logOut()
      })
    }, 200)
  }

  /**
   * 关闭用户菜单弹出层
   */
  const closeUserMenu = (): void => {
    setTimeout(() => {
      userMenuPopover.value.hide()
    }, 100)
  }
</script>

<style scoped>
  @reference '@styles/core/tailwind.css';

  @layer components {
    .btn-item {
      @apply flex items-center p-2 mb-3 select-none rounded-md cursor-pointer last:mb-0;

      span {
        @apply text-sm;
      }

      .art-svg-icon {
        @apply mr-2 text-base;
      }

      &:hover {
        background-color: var(--art-gray-200);
      }
    }
  }

  .log-out {
    @apply py-1.5
    text-xs
    text-center
    border
    border-g-400
    rounded-md
    transition-all
    duration-200
    hover:shadow-xl;
  }
</style>
