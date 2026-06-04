<!-- 系统logo -->
<template>
  <div class="flex-cc">
    <img
      v-if="customLogo"
      :style="logoStyle"
      :src="customLogo"
      alt="logo"
      class="w-full h-full object-contain"
    />
    <img v-else :style="logoStyle" src="@imgs/common/logo.webp" alt="logo" class="w-full h-full" />
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted } from 'vue'
  import { useSiteSettingsStore } from '@/store/modules/site-settings'

  defineOptions({ name: 'ArtLogo' })

  interface Props {
    /** logo 大小 */
    size?: number | string
  }

  const props = withDefaults(defineProps<Props>(), {
    size: 36
  })

  const siteSettingsStore = useSiteSettingsStore()

  onMounted(() => {
    siteSettingsStore.initSettings()
  })

  const customLogo = computed(() => siteSettingsStore.settings.basic.siteLogo)
  const logoStyle = computed(() => ({ width: `${props.size}px`, height: `${props.size}px` }))
</script>
