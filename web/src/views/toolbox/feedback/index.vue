<!-- 用户意见反馈页面 -->
<template>
  <div class="feedback-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <ElButton link @click="goBack">
        <ElIcon class="mr-1"><ArrowLeft /></ElIcon>
        返回
      </ElButton>
      <span class="page-title">意见反馈</span>
    </div>

    <!-- 左右布局 -->
    <ElRow :gutter="20">
      <!-- 左侧：反馈表单 -->
      <ElCol :xs="24" :sm="24" :md="14" :lg="14">
        <ElCard shadow="never" class="art-card">
          <template #header>
            <div class="card-header">
              <ArtSvgIcon icon="ri:feedback-line" class="mr-2" />
              <span>提交反馈</span>
            </div>
          </template>

          <ElForm ref="formRef" :model="feedbackForm" :rules="formRules" label-width="100px">
            <ElFormItem label="反馈类型" prop="type">
              <ElRadioGroup v-model="feedbackForm.type">
                <ElRadio value="suggestion">功能建议</ElRadio>
                <ElRadio value="bug">问题反馈</ElRadio>
                <ElRadio value="other">其他</ElRadio>
              </ElRadioGroup>
            </ElFormItem>

            <ElFormItem label="相关工具" prop="toolId">
              <ElSelect
                v-model="feedbackForm.toolId"
                placeholder="请选择相关工具（可选）"
                clearable
                filterable
                style="width: 100%"
              >
                <ElOptionGroup
                  v-for="category in toolCategories"
                  :key="category.id"
                  :label="category.name"
                >
                  <ElOption
                    v-for="tool in category.tools"
                    :key="tool.id"
                    :label="tool.name"
                    :value="tool.id"
                  />
                </ElOptionGroup>
              </ElSelect>
            </ElFormItem>

            <ElFormItem label="反馈内容" prop="content">
              <ElInput
                v-model="feedbackForm.content"
                type="textarea"
                :rows="5"
                placeholder="请详细描述您的建议或遇到的问题..."
                maxlength="1000"
                show-word-limit
              />
            </ElFormItem>

            <ElFormItem label="联系方式" prop="contact">
              <ElInput
                v-model="feedbackForm.contact"
                placeholder="邮箱或手机号（可选，方便我们回复您）"
              />
            </ElFormItem>

            <ElFormItem>
              <ElButton type="primary" :loading="submitting" @click="handleSubmit">
                <ElIcon class="mr-1"><Check /></ElIcon>
                提交反馈
              </ElButton>
              <ElButton @click="handleReset">
                <ElIcon class="mr-1"><Refresh /></ElIcon>
                重置
              </ElButton>
            </ElFormItem>
          </ElForm>
        </ElCard>
      </ElCol>

      <!-- 右侧：常见问题 -->
      <ElCol :xs="24" :sm="24" :md="10" :lg="10">
        <ElCard shadow="never" class="art-card">
          <template #header>
            <div class="card-header">
              <ArtSvgIcon icon="ri:question-line" class="mr-2" />
              <span>常见问题</span>
            </div>
          </template>

          <ElCollapse v-model="activeFaq" accordion>
            <ElCollapseItem title="文件处理后多久会过期？" name="1">
              <p class="faq-content"
                >处理后的文件默认保留1小时，您可以在历史记录中查看剩余时间。过期后文件将自动删除。</p
              >
            </ElCollapseItem>
            <ElCollapseItem title="支持哪些文件格式？" name="2">
              <p class="faq-content"
                >我们支持常见的图片格式（JPG、PNG、WEBP、GIF）、PDF文件、以及部分文档格式。具体支持的格式请查看各工具页面说明。</p
              >
            </ElCollapseItem>
            <ElCollapseItem title="文件处理是否安全？" name="3">
              <p class="faq-content"
                >所有文件处理均在您的浏览器本地完成，文件不会上传到服务器，完全保护您的隐私安全。</p
              >
            </ElCollapseItem>
            <ElCollapseItem title="为什么处理大文件很慢？" name="4">
              <p class="faq-content"
                >由于所有处理都在浏览器中进行，处理速度取决于您的设备性能。建议处理大文件时关闭其他占用资源的程序。</p
              >
            </ElCollapseItem>
            <ElCollapseItem title="如何查看处理历史？" name="5">
              <p class="faq-content"
                >点击页面顶部的历史记录按钮，可以查看所有处理过的文件记录，并在有效期内重新下载。</p
              >
            </ElCollapseItem>
          </ElCollapse>
        </ElCard>
      </ElCol>
    </ElRow>
  </div>
</template>

<script setup lang="ts">
  import { ref, reactive, computed } from 'vue'
  import { useRouter } from 'vue-router'
  import { ElMessage } from 'element-plus'
  import { ArrowLeft, Check, Refresh } from '@element-plus/icons-vue'
  import type { FormInstance, FormRules } from 'element-plus'

  defineOptions({ name: 'FeedbackPage' })

  const router = useRouter()
  const formRef = ref<FormInstance>()
  const submitting = ref(false)
  const activeFaq = ref('1')

  // 反馈表单
  const feedbackForm = reactive({
    type: 'suggestion',
    toolId: '',
    content: '',
    contact: ''
  })

  // 表单验证规则
  const formRules: FormRules = {
    type: [{ required: true, message: '请选择反馈类型', trigger: 'change' }],
    content: [
      { required: true, message: '请输入反馈内容', trigger: 'blur' },
      { min: 10, message: '反馈内容至少10个字符', trigger: 'blur' }
    ]
  }

  // 工具分类数据
  const toolCategories = computed(() => [
    {
      id: 'image',
      name: '图片工具',
      tools: [
        { id: 'image-compress', name: '图片压缩' },
        { id: 'image-convert', name: '格式转换' },
        { id: 'image-crop', name: '图片裁剪' },
        { id: 'image-resize', name: '尺寸调整' },
        { id: 'image-rotate', name: '图片旋转' },
        { id: 'image-splice', name: '长图拼接' },
        { id: 'image-watermark', name: '图片水印' }
      ]
    },
    {
      id: 'pdf',
      name: 'PDF工具',
      tools: [
        { id: 'pdf-merge', name: 'PDF合并' },
        { id: 'pdf-split', name: 'PDF拆分' },
        { id: 'pdf-compress', name: 'PDF压缩' },
        { id: 'pdf-extract', name: '页面提取' },
        { id: 'pdf-delete', name: '页面删除' },
        { id: 'pdf-rotate', name: '页面旋转' },
        { id: 'pdf-reorder', name: '页面重排' },
        { id: 'pdf-watermark', name: 'PDF水印' },
        { id: 'pdf-encrypt', name: 'PDF加密' }
      ]
    },
    {
      id: 'video',
      name: '视频工具',
      tools: [
        { id: 'screen-record', name: '在线录屏' },
        { id: 'video-to-gif', name: '视频转GIF' }
      ]
    },
    {
      id: 'utils',
      name: '实用工具',
      tools: [
        { id: 'qrcode', name: '二维码生成' },
        { id: 'base64', name: 'Base64转换' }
      ]
    }
  ])

  // 返回
  const goBack = () => {
    router.push('/')
  }

  // 获取工具名称
  const getToolName = (toolId: string): string => {
    for (const category of toolCategories.value) {
      const tool = category.tools.find((t) => t.id === toolId)
      if (tool) return tool.name
    }
    return ''
  }

  // 提交反馈
  const handleSubmit = async () => {
    if (!formRef.value) return

    await formRef.value.validate((valid) => {
      if (valid) {
        submitting.value = true

        setTimeout(() => {
          const feedbacks = JSON.parse(localStorage.getItem('user-feedbacks') || '[]')
          feedbacks.push({
            id: `FB${Date.now()}`,
            ...feedbackForm,
            toolName: getToolName(feedbackForm.toolId),
            status: 'pending',
            createdAt: new Date().toISOString()
          })
          localStorage.setItem('user-feedbacks', JSON.stringify(feedbacks))

          submitting.value = false
          ElMessage.success('反馈提交成功，感谢您的意见！')
          handleReset()
        }, 500)
      }
    })
  }

  // 重置表单
  const handleReset = () => {
    formRef.value?.resetFields()
    feedbackForm.type = 'suggestion'
    feedbackForm.toolId = ''
    feedbackForm.content = ''
    feedbackForm.contact = ''
  }
</script>

<style scoped lang="scss">
  .feedback-page {
    .page-header {
      display: flex;
      align-items: center;
      margin-bottom: 20px;
    }

    .page-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--el-text-color-primary);
      margin-left: 8px;
    }

    .card-header {
      display: flex;
      align-items: center;
      font-weight: 600;
      font-size: 15px;
    }

    .faq-content {
      margin: 0;
      color: var(--el-text-color-secondary);
      line-height: 1.6;
    }

    :deep(.el-collapse) {
      border-top: none;
    }

    :deep(.el-collapse-item__header) {
      font-weight: 500;
    }

    :deep(.el-collapse-item:last-child .el-collapse-item__wrap) {
      border-bottom: none;
    }

    :deep(.el-card) {
      margin-bottom: 20px;
    }
  }
</style>
