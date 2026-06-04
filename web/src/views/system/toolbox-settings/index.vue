<!-- 工具箱系统设置页面 -->
<template>
  <div class="toolbox-settings-page art-full-height">
    <ElCard shadow="never" class="art-table-card">
      <!-- 设置内容 -->
      <div class="settings-content" v-loading="loading">
        <!-- 工具设置（从后端同步） -->
        <div class="settings-section">
          <div class="section-header">
            <ArtSvgIcon icon="ri:tools-line" class="text-lg" />
            <span>工具设置</span>
          </div>
          <ArtForm
            v-model="toolSettings"
            :items="toolSettingsItems"
            :span="12"
            :show-reset="false"
            :show-submit="false"
            label-width="140px"
          />
        </div>

        <!-- 文件处理设置 -->
        <div class="settings-section">
          <div class="section-header">
            <ArtSvgIcon icon="ri:file-3-line" class="text-lg" />
            <span>文件处理设置</span>
          </div>
          <ArtForm
            v-model="localSettings"
            :items="fileProcessItems"
            :span="12"
            :show-reset="false"
            :show-submit="false"
            label-width="140px"
          />
        </div>

        <!-- 文件存储设置 -->
        <div class="settings-section">
          <div class="section-header">
            <ArtSvgIcon icon="ri:folder-open-line" class="text-lg" />
            <span>文件存储设置</span>
          </div>
          <ArtForm
            v-model="localSettings"
            :items="fileStorageItems"
            :span="12"
            :show-reset="false"
            :show-submit="false"
            label-width="140px"
          />
        </div>

        <!-- 安全设置 -->
        <div class="settings-section">
          <div class="section-header">
            <ArtSvgIcon icon="ri:shield-check-line" class="text-lg" />
            <span>安全设置</span>
          </div>
          <ArtForm
            v-model="localSettings"
            :items="securityItems"
            :span="12"
            :show-reset="false"
            :show-submit="false"
            label-width="140px"
          />
        </div>

        <!-- 操作按钮 -->
        <div class="actions-bar">
          <ElButton @click="handleReset" v-ripple>恢复默认</ElButton>
          <ElButton type="primary" :loading="saving" @click="handleSave" v-ripple
            >保存设置</ElButton
          >
        </div>
      </div>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, reactive, onMounted, watch } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import ArtForm, { type FormItem } from '@/components/core/forms/art-form/index.vue'
  import { useToolboxSettingsStore, type ToolboxSettings } from '@/store/modules/toolbox/settings'
  import { useSiteSettingsStore } from '@/store/modules/site-settings'

  defineOptions({ name: 'ToolboxSettings' })

  const saving = ref(false)
  const loading = ref(false)
  const toolboxSettingsStore = useToolboxSettingsStore()
  const siteSettingsStore = useSiteSettingsStore()

  // 本地设置数据（用于表单绑定）
  const localSettings = reactive<ToolboxSettings>({ ...toolboxSettingsStore.settings })

  // 工具设置数据（从网站设置同步）
  const toolSettings = reactive({
    maxFileSize: 200,
    resultRetention: 24,
    showHistory: true,
    enableWatermark: false,
    watermarkText: ''
  })

  // 监听 store 变化，同步到本地
  watch(
    () => toolboxSettingsStore.settings,
    (newVal) => {
      Object.assign(localSettings, newVal)
    },
    { deep: true }
  )

  // 工具设置表单配置
  const toolSettingsItems = computed<FormItem[]>(() => [
    {
      key: 'maxFileSize',
      label: '文件大小限制(MB)',
      type: 'number',
      props: { min: 1, max: 1024 },
      span: 12
    },
    {
      key: 'resultRetention',
      label: '结果保留(小时)',
      type: 'number',
      props: { min: 1, max: 168 },
      span: 12
    },
    { key: 'showHistory', label: '显示处理历史', type: 'switch', span: 12 },
    { key: 'enableWatermark', label: '启用水印功能', type: 'switch', span: 12 },
    {
      key: 'watermarkText',
      label: '默认水印文本',
      type: 'input',
      props: { disabled: !toolSettings.enableWatermark },
      placeholder: '请输入水印文本',
      span: 24
    }
  ])

  // 文件处理设置表单配置
  const fileProcessItems = computed<FormItem[]>(() => [
    {
      key: 'maxFileSize',
      label: '单文件大小限制(MB)',
      type: 'number',
      props: { min: 1, max: 500, step: 10, controlsPosition: 'right' },
      span: 12
    },
    {
      key: 'maxBatchCount',
      label: '批量处理数量(个)',
      type: 'number',
      props: { min: 1, max: 100, step: 5, controlsPosition: 'right' },
      span: 12
    },
    {
      key: 'processTimeout',
      label: '处理超时时间(秒)',
      type: 'number',
      props: { min: 10, max: 600, step: 10, controlsPosition: 'right' },
      span: 12
    }
  ])

  // 文件存储设置表单配置
  const fileStorageItems = computed<FormItem[]>(() => [
    {
      key: 'fileRetentionHours',
      label: '文件保留时间(小时)',
      type: 'number',
      props: { min: 1, max: 72, step: 1, controlsPosition: 'right' },
      span: 12
    },
    {
      key: 'maxHistoryCount',
      label: '历史记录保留(条)',
      type: 'number',
      props: { min: 10, max: 500, step: 10, controlsPosition: 'right' },
      span: 12
    },
    {
      key: 'autoCleanHistory',
      label: '自动清理历史记录',
      type: 'switch',
      span: 12
    }
  ])

  // 安全设置表单配置
  const securityItems = computed<FormItem[]>(() => [
    {
      key: 'enableFileTypeCheck',
      label: '启用文件类型检测',
      type: 'switch',
      span: 12
    },
    {
      key: 'enableProcessLog',
      label: '启用处理日志',
      type: 'switch',
      span: 12
    },
    {
      key: 'allowedFileTypes',
      label: '允许的文件类型',
      type: 'select',
      props: {
        multiple: true,
        filterable: true,
        allowCreate: true,
        defaultFirstOption: true,
        placeholder: '请选择或输入允许的文件类型',
        options: [
          { label: 'PDF (.pdf)', value: 'pdf' },
          { label: 'Word (.doc, .docx)', value: 'doc' },
          { label: 'Excel (.xls, .xlsx)', value: 'xls' },
          { label: 'PowerPoint (.ppt, .pptx)', value: 'ppt' },
          { label: '图片 (.jpg, .png, .gif, .webp)', value: 'image' },
          { label: '文本 (.txt)', value: 'txt' }
        ]
      },
      span: 24
    }
  ])

  // 加载设置
  const loadSettings = async () => {
    loading.value = true
    try {
      // 加载网站设置中的工具设置
      await siteSettingsStore.fetchSettings()
      const siteSettings = siteSettingsStore.settings
      if (siteSettings.tool) {
        Object.assign(toolSettings, siteSettings.tool)
      }
      // 同步本地设置
      Object.assign(localSettings, toolboxSettingsStore.settings)
    } catch (err) {
      console.error('加载设置失败:', err)
    } finally {
      loading.value = false
    }
  }

  // 保存设置
  const handleSave = async () => {
    saving.value = true

    try {
      // 保存工具设置到网站设置（后端数据库）
      await siteSettingsStore.updateSettings({
        ...siteSettingsStore.settings,
        tool: { ...toolSettings }
      })

      // 保存本地设置到 store（localStorage）
      toolboxSettingsStore.updateSettings(localSettings)
    } catch (err) {
      console.error('保存失败:', err)
    } finally {
      saving.value = false
    }
  }

  // 恢复默认设置
  const handleReset = () => {
    ElMessageBox.confirm('确定要恢复默认设置吗？当前设置将被覆盖。', '恢复默认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
      .then(async () => {
        loading.value = true
        try {
          // 恢复本地设置到默认状态
          toolboxSettingsStore.resetToDefault()
          Object.assign(localSettings, toolboxSettingsStore.settings)

          // 恢复工具设置到默认值
          Object.assign(toolSettings, {
            maxFileSize: 200,
            resultRetention: 24,
            showHistory: true,
            enableWatermark: false,
            watermarkText: ''
          })

          // 同步到后端
          await siteSettingsStore.updateSettings({
            ...siteSettingsStore.settings,
            tool: { ...toolSettings }
          })
        } catch (err) {
          console.error('恢复默认失败:', err)
        } finally {
          loading.value = false
        }
      })
      .catch(() => {})
  }

  onMounted(() => {
    loadSettings()
  })
</script>

<style scoped lang="scss">
  .toolbox-settings-page {
    .settings-content {
      padding: 0 0 16px;
    }

    .settings-section {
      margin-bottom: 24px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--el-border-color-lighter);
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      font-size: 15px;
      color: var(--el-text-color-primary);
      margin-bottom: 16px;
      padding: 16px 16px 0;
    }

    .actions-bar {
      display: flex;
      justify-content: flex-start;
      gap: 12px;
      padding: 16px;
      border-top: 1px solid var(--el-border-color-lighter);
    }
  }
</style>
