<template>
  <footer class="art-footer">
    <div class="footer-content">
      <div class="footer-left">
        <div class="footer-logo">
          <img
            v-if="settings.basic.siteLogo"
            :src="settings.basic.siteLogo"
            alt="Logo"
            class="logo-image"
          />
          <ElIcon v-else :size="32" color="#5D87FF">
            <Box />
          </ElIcon>
        </div>
        <div class="footer-info">
          <h3 class="footer-title">{{
            settings.basic.siteSubtitle || '轻松办公，工具助你一臂之力'
          }}</h3>
          <div class="footer-links">
            <a
              v-if="settings.contact.privacyLink"
              :href="settings.contact.privacyLink"
              target="_blank"
              class="footer-link"
              >隐私政策</a
            >
            <span
              v-if="settings.contact.privacyLink && settings.contact.termsLink"
              class="separator"
              >|</span
            >
            <a
              v-if="settings.contact.termsLink"
              :href="settings.contact.termsLink"
              target="_blank"
              class="footer-link"
              >用户协议</a
            >
          </div>
          <p class="footer-copyright">{{ settings.copyright.text }}</p>
          <div v-if="settings.copyright.showBeian" class="footer-beian">
            <a
              v-if="settings.copyright.icp"
              href="https://beian.miit.gov.cn/"
              target="_blank"
              class="beian-link"
            >
              {{ settings.copyright.icp }}
            </a>
            <a
              v-if="settings.copyright.police"
              href="http://www.beian.gov.cn/"
              target="_blank"
              class="beian-link"
            >
              {{ settings.copyright.police }}
            </a>
          </div>
        </div>
      </div>
      <div v-if="settings.contact.wechatQrcode" class="footer-right">
        <div class="qrcode-container">
          <img :src="settings.contact.wechatQrcode" alt="微信公众号" class="qrcode-image" />
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
  import { computed, onMounted } from 'vue'
  import { Box } from '@element-plus/icons-vue'
  import { useSiteSettingsStore } from '@/store/modules/site-settings'

  defineOptions({ name: 'ArtFooter' })

  const siteSettingsStore = useSiteSettingsStore()

  onMounted(() => {
    siteSettingsStore.initSettings()
  })

  const settings = computed(() => siteSettingsStore.settings)
</script>

<style scoped lang="scss">
  .art-footer {
    width: 100%;
    padding: 40px 0;
    background: var(--default-bg-color);
    border-top: 1px solid var(--art-border-color);

    .footer-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .footer-left {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      flex: 1;
    }

    .footer-logo {
      flex-shrink: 0;
      padding-top: 2px;

      .logo-image {
        height: 32px;
        width: auto;
        object-fit: contain;
      }
    }

    .footer-info {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .footer-title {
      margin: 0;
      font-size: 15px;
      font-weight: 500;
      color: var(--art-text-color);
      line-height: 1.6;
    }

    .footer-links {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: var(--art-text-color-secondary);

      .footer-link {
        color: var(--art-text-color-secondary);
        text-decoration: none;
        transition: color 0.2s;

        &:hover {
          color: var(--el-color-primary);
        }
      }

      .separator {
        color: var(--art-border-color);
      }
    }

    .footer-copyright {
      margin: 0;
      font-size: 12px;
      color: var(--art-text-color-placeholder);
      line-height: 1.5;
    }

    .footer-beian {
      display: flex;
      gap: 16px;
      margin-top: 4px;

      .beian-link {
        font-size: 12px;
        color: var(--art-text-color-placeholder);
        text-decoration: none;
        transition: color 0.2s;

        &:hover {
          color: var(--el-color-primary);
        }
      }
    }

    .footer-right {
      flex-shrink: 0;
      margin-left: 40px;
    }

    .qrcode-container {
      width: 100px;
      height: 100px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fff;
      border-radius: 8px;
      border: 1px solid var(--art-border-color);
      overflow: hidden;

      .qrcode-image {
        width: 100%;
        height: 100%;
        padding: 10px;
        object-fit: cover;
      }
    }

    // 响应式布局
    @media (max-width: 768px) {
      padding: 30px 0;

      .footer-content {
        flex-direction: column;
        gap: 20px;
        align-items: flex-start;
      }

      .footer-right {
        margin-left: 0;
        align-self: center;
      }
    }
  }
</style>
