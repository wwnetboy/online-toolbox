<template>
  <div class="flex flex-col gap-4 pb-5">
    <ToolSearchBar
      :title="toolName || '图片裁剪'"
      :description="toolDescription || '支持自定义尺寸、固定比例和证件照模板裁剪'"
    />
    <PermissionGuard feature-id="image-crop" feature-name="图片裁剪" ref="permissionGuardRef">
      <ElCard shadow="never" class="art-card">
        <div class="tool-header">
          <ToolIcon :icon="toolIcon" :icon-url="toolIconUrl" :color="toolColor" />
          <span class="tool-title">{{ toolName || '图片裁剪' }}</span>
        </div>
        <!-- 未上传图片时显示模板选择和上传区域 -->
        <template v-if="!currentImage">
          <!-- 模板选择 -->
          <div class="template-section mb-6">
            <div class="text-sm font-medium text-g-600 mb-3">选择裁剪模板</div>
            <ElTabs v-model="activeTemplateTab">
              <ElTabPane label="自定义" name="custom">
                <div class="custom-size-form">
                  <ElForm :model="customSize" label-width="80px" size="default">
                    <ElFormItem label="宽度">
                      <ElInputNumber v-model="customSize.width" :min="100" :max="5000" :step="10" />
                      <span class="ml-2 text-g-400">像素</span>
                    </ElFormItem>
                    <ElFormItem label="高度">
                      <ElInputNumber
                        v-model="customSize.height"
                        :min="100"
                        :max="5000"
                        :step="10"
                      />
                      <span class="ml-2 text-g-400">像素</span>
                    </ElFormItem>
                  </ElForm>
                </div>
              </ElTabPane>
              <ElTabPane label="固定比例" name="ratio">
                <div class="template-grid">
                  <div
                    v-for="template in ratioTemplates"
                    :key="template.name"
                    class="template-card"
                    :class="{ active: selectedTemplate?.name === template.name }"
                    @click="selectTemplate(template)"
                  >
                    <div class="template-icon">
                      <div
                        class="ratio-box"
                        :style="{
                          width: template.width > template.height ? '50px' : '35px',
                          height: template.width > template.height ? '35px' : '50px'
                        }"
                      ></div>
                    </div>
                    <p class="template-name">{{ template.name }}</p>
                    <p class="template-desc">{{ template.width }}:{{ template.height }}</p>
                  </div>
                </div>
              </ElTabPane>
              <ElTabPane label="证件照" name="photo">
                <div class="template-grid">
                  <div
                    v-for="template in photoTemplates"
                    :key="template.name"
                    class="template-card"
                    :class="{ active: selectedTemplate?.name === template.name }"
                    @click="selectTemplate(template)"
                  >
                    <div class="template-icon"
                      ><ElIcon class="text-2xl"><User /></ElIcon
                    ></div>
                    <p class="template-name">{{ template.name }}</p>
                    <p class="template-desc">{{ template.width }}×{{ template.height }}px</p>
                  </div>
                </div>
              </ElTabPane>
            </ElTabs>
          </div>
          <!-- 上传区域 -->
          <div
            class="upload-area"
            :class="{ 'is-dragging': isDragging }"
            @click="triggerFileSelect"
            @dragenter="handleDragEnter"
            @dragleave="handleDragLeave"
            @dragover="handleDragOver"
            @drop="handleDrop"
          >
            <Icon icon="ri:image-add-line" class="text-5xl text-g-300 mb-3" />
            <p class="text-base text-g-600 mb-2">点击或拖拽图片到此处上传</p>
            <p class="text-sm text-g-400">支持 JPG/PNG 格式，单个文件不超过 20MB</p>
          </div>
          <input
            ref="fileInputRef"
            type="file"
            accept="image/jpeg,image/png"
            hidden
            @change="handleFileSelect"
          />
        </template>
        <!-- 已上传图片时显示裁剪区域 -->
        <template v-else>
          <div class="crop-container">
            <ArtCutterImg
              :cut-width="cropWidth"
              :cut-height="cropHeight"
              :box-width="700"
              :box-height="500"
              :show-preview="true"
              :img-url="currentImage"
              title="裁剪图片"
              preview-title="预览"
              @update:img-url="handleCropComplete"
              @error="handleCropError"
            />
          </div>
          <div class="file-actions mt-4">
            <ElButton size="large" @click="resetCrop"
              ><ElIcon class="mr-1"><Refresh /></ElIcon>重新选择</ElButton
            >
          </div>
        </template>
      </ElCard>
    </PermissionGuard>
    <ElCard shadow="never" class="art-card">
      <div class="text-base font-medium text-g-800 mb-4">功能介绍</div>
      <div class="text-sm text-g-600 leading-relaxed">
        <p class="mb-3">图片裁剪工具支持多种裁剪模式：</p>
        <ul class="list-disc list-inside space-y-1 text-g-500">
          <li>自定义尺寸裁剪</li>
          <li>固定比例裁剪（16:9、4:3、1:1等）</li>
          <li>证件照模板（1寸、2寸、社保照等）</li>
          <li>所有处理在浏览器本地完成，保护隐私</li>
        </ul>
      </div>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { ElMessage } from 'element-plus'
  import { User, Refresh } from '@element-plus/icons-vue'
  import { Icon } from '@iconify/vue'
  import ToolSearchBar from '../../components/ToolSearchBar.vue'
  import ToolIcon from '../../components/ToolIcon.vue'
  import { useCurrentTool } from '@/hooks/core/useCurrentTool'
  import PermissionGuard from '@/components/business/permission-guard/index.vue'
  import ArtCutterImg from '@/components/core/media/art-cutter-img/index.vue'
  import { useUpload } from '@/hooks/core/useUpload'
  import { useHistory } from '@/hooks/core/useHistory'

  defineOptions({ name: 'ImageCropPage' })

  const { toolIcon, toolIconUrl, toolColor, toolName, toolDescription } = useCurrentTool()

  const permissionGuardRef = ref<InstanceType<typeof PermissionGuard>>()
  const fileInputRef = ref<HTMLInputElement>()
  const currentImage = ref<string>('')
  const croppedImage = ref<string>('')
  const activeTemplateTab = ref('custom')
  const selectedTemplate = ref<any>(null)
  const customSize = ref({ width: 800, height: 600 })

  const ratioTemplates = [
    { name: '16:9 横版', width: 16, height: 9, category: 'ratio' },
    { name: '4:3 标准', width: 4, height: 3, category: 'ratio' },
    { name: '1:1 正方形', width: 1, height: 1, category: 'ratio' },
    { name: '9:16 竖版', width: 9, height: 16, category: 'ratio' },
    { name: '3:2 经典', width: 3, height: 2, category: 'ratio' }
  ]

  const photoTemplates = [
    { name: '1寸照片', width: 295, height: 413, category: 'photo' },
    { name: '2寸照片', width: 413, height: 579, category: 'photo' },
    { name: '小1寸', width: 260, height: 378, category: 'photo' },
    { name: '社保照', width: 358, height: 441, category: 'photo' }
  ]

  const cropWidth = computed(() => {
    if (activeTemplateTab.value === 'custom') return customSize.value.width
    if (selectedTemplate.value) {
      if (selectedTemplate.value.category === 'ratio') {
        const ratio = selectedTemplate.value.width / selectedTemplate.value.height
        return ratio > 1 ? 600 : Math.round(400 * ratio)
      }
      return selectedTemplate.value.width
    }
    return 800
  })

  const cropHeight = computed(() => {
    if (activeTemplateTab.value === 'custom') return customSize.value.height
    if (selectedTemplate.value) {
      if (selectedTemplate.value.category === 'ratio') {
        const ratio = selectedTemplate.value.width / selectedTemplate.value.height
        return ratio > 1 ? Math.round(600 / ratio) : 400
      }
      return selectedTemplate.value.height
    }
    return 600
  })

  const { isDragging, handleDragEnter, handleDragLeave, handleDragOver } = useUpload({
    accept: 'image/jpeg,image/png',
    multiple: false,
    maxSize: 20,
    maxCount: 1
  })

  // 历史记录
  const { addRecord } = useHistory()

  const selectTemplate = (template: any) => {
    selectedTemplate.value = template
  }
  const triggerFileSelect = () => {
    fileInputRef.value?.click()
  }

  const handleFileSelect = (event: Event) => {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    if (file) processFile(file)
  }

  const handleDrop = (event: DragEvent) => {
    event.preventDefault()
    isDragging.value = false
    const file = event.dataTransfer?.files[0]
    if (file) processFile(file)
  }

  const processFile = (file: File) => {
    if (!file.type.match(/^image\/(jpeg|png)$/)) {
      ElMessage.error('只支持 JPG/PNG 格式的图片')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      ElMessage.error('文件大小不能超过 20MB')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      currentImage.value = e.target?.result as string
    }
    reader.onerror = () => {
      ElMessage.error('文件读取失败')
    }
    reader.readAsDataURL(file)
  }

  const handleCropComplete = async (dataURL: string) => {
    // 先检查权限
    const hasPermission = await permissionGuardRef.value?.checkBeforeAction()
    if (!hasPermission) {
      return
    }

    croppedImage.value = dataURL
    // 记录功能使用
    permissionGuardRef.value?.recordUsage()

    // 保存历史记录
    if (dataURL) {
      // 将 dataURL 转换为 Blob
      fetch(dataURL)
        .then((res) => res.blob())
        .then((blob) => {
          const blobUrl = URL.createObjectURL(blob)
          const fileName = `裁剪_${cropWidth.value}x${cropHeight.value}_${Date.now()}.png`
          addRecord({
            toolId: 'image-crop',
            toolName: '图片裁剪',
            fileName: '原图',
            outputFileName: fileName,
            fileSize: 0,
            outputFileSize: blob.size,
            processType: 'crop',
            downloadUrl: blobUrl
          })
        })
    }
  }
  const handleCropError = (error: any) => {
    ElMessage.error('裁剪失败：' + (error.message || '未知错误'))
  }
  const resetCrop = () => {
    currentImage.value = ''
    croppedImage.value = ''
    selectedTemplate.value = null
  }
</script>

<style scoped lang="scss">
  .tool-header {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-bottom: 20px;
  }

  .tool-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  .template-section {
    padding: 16px;
    background: var(--el-fill-color-lighter);
    border-radius: 8px;
  }

  .custom-size-form {
    padding: 16px 0;
  }

  .template-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 12px;
    padding: 16px 0;
  }

  .template-card {
    padding: 12px;
    text-align: center;
    cursor: pointer;
    border: 2px solid var(--el-border-color);
    border-radius: 8px;
    transition: all 0.3s;

    &:hover {
      border-color: var(--theme-color);
    }

    &.active {
      background: var(--theme-color-light-9);
      border-color: var(--theme-color);
    }
  }

  .template-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 60px;
    margin-bottom: 8px;
    color: var(--theme-color);

    .ratio-box {
      background: var(--theme-color-light-9);
      border: 2px solid var(--theme-color);
    }
  }

  .template-name {
    margin: 0 0 2px;
    font-size: 13px;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  .template-desc {
    margin: 0;
    font-size: 11px;
    color: var(--el-text-color-secondary);
  }

  .upload-area {
    padding: 60px 20px;
    text-align: center;
    cursor: pointer;
    border: 2px dashed var(--el-border-color);
    border-radius: var(--custom-radius);
    transition: all 0.3s;

    &:hover,
    &.is-dragging {
      background: var(--theme-color-light-9);
      border-color: var(--theme-color);
    }
  }

  .crop-container {
    padding: 16px;
    background: var(--el-fill-color-lighter);
    border-radius: 8px;
  }

  .file-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
  }
</style>
