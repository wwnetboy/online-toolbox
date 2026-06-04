<!-- 工具编辑弹窗 -->
<template>
  <ElDialog
    v-model="visible"
    :title="dialogType === 'add' ? '新增工具' : '编辑工具'"
    width="600px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <ElForm ref="formRef" :model="formData" :rules="rules" label-width="100px">
      <ElFormItem label="工具名称" prop="name">
        <ElInput v-model="formData.name" placeholder="请输入工具名称" />
      </ElFormItem>

      <ElFormItem label="工具描述" prop="description">
        <ElInput
          v-model="formData.description"
          type="textarea"
          :rows="3"
          placeholder="请输入工具描述"
        />
      </ElFormItem>

      <ElFormItem label="工具图标" prop="iconUrl">
        <IconUpload v-model="formData.iconUrl" />
      </ElFormItem>

      <ElFormItem label="所属分类" prop="category">
        <ElSelect v-model="formData.category" placeholder="请选择分类" style="width: 100%">
          <ElOption
            v-for="cat in categoryOptions"
            :key="cat.id"
            :label="cat.name"
            :value="cat.id"
          />
        </ElSelect>
      </ElFormItem>

      <ElFormItem label="搜索关键词" prop="keywords">
        <ElSelect
          v-model="formData.keywords"
          multiple
          filterable
          allow-create
          default-first-option
          placeholder="请输入关键词后按回车添加"
          style="width: 100%"
        />
      </ElFormItem>

      <ElFormItem label="标签" prop="badge">
        <ElRadioGroup v-model="formData.badge">
          <ElRadio :value="undefined">无</ElRadio>
          <ElRadio value="hot">热门</ElRadio>
          <ElRadio value="new">新</ElRadio>
        </ElRadioGroup>
      </ElFormItem>

      <ElFormItem label="启用状态" prop="enabled">
        <ElSwitch v-model="formData.enabled" />
      </ElFormItem>
    </ElForm>

    <template #footer>
      <ElButton @click="handleClose">取消</ElButton>
      <ElButton type="primary" :loading="submitting" @click="handleSubmit"> 确定 </ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { ref, reactive, watch, computed } from 'vue'
  import type { FormInstance, FormRules } from 'element-plus'
  import IconUpload from '@/components/business/icon-upload/index.vue'
  import { useToolsStore, type ManagedTool, type ToolCategory } from '@/store/modules/toolbox'

  interface Props {
    modelValue: boolean
    dialogType: 'add' | 'edit'
    toolData: Partial<ManagedTool>
    categoryOptions: ToolCategory[]
  }

  const props = defineProps<Props>()

  const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void
    (e: 'success'): void
  }>()

  const toolsStore = useToolsStore()

  const visible = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
  })

  const formRef = ref<FormInstance>()
  const submitting = ref(false)

  // 表单数据
  const formData = reactive<Partial<ManagedTool>>({
    id: '',
    name: '',
    description: '',
    iconUrl: null,
    category: '',
    keywords: [],
    badge: undefined,
    enabled: true
  })

  // 表单验证规则
  const rules: FormRules = {
    name: [
      { required: true, message: '请输入工具名称', trigger: 'blur' },
      { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
    ],
    description: [{ required: true, message: '请输入工具描述', trigger: 'blur' }],
    iconUrl: [{ required: true, message: '请上传工具图标', trigger: 'change' }],
    category: [{ required: true, message: '请选择所属分类', trigger: 'change' }]
  }

  // 监听工具数据变化
  watch(
    () => props.toolData,
    (newVal) => {
      if (newVal) {
        Object.assign(formData, {
          id: newVal.id || '',
          name: newVal.name || '',
          description: newVal.description || '',
          iconUrl: newVal.iconUrl || null,
          category: newVal.category || '',
          keywords: newVal.keywords || [],
          badge: newVal.badge,
          enabled: newVal.enabled !== false
        })
      }
    },
    { immediate: true, deep: true }
  )

  // 关闭弹窗
  const handleClose = () => {
    formRef.value?.resetFields()
    visible.value = false
  }

  // 生成工具ID
  const generateToolId = (name: string, category: string) => {
    const timestamp = Date.now().toString(36)
    const nameSlug = name.toLowerCase().replace(/\s+/g, '-')
    return `${category}-${nameSlug}-${timestamp}`
  }

  // 提交表单
  const handleSubmit = async () => {
    if (!formRef.value) return

    await formRef.value.validate(async (valid) => {
      if (valid) {
        submitting.value = true

        try {
          if (props.dialogType === 'add') {
            // 新增工具 - 找到分类的数据库 ID
            const category = props.categoryOptions.find((c) => c.id === formData.category)
            await toolsStore.addTool({
              id: '',
              name: formData.name!,
              description: formData.description || '',
              iconUrl: formData.iconUrl || null,
              category: formData.category!,
              categoryId: category?.dbId,
              badge: formData.badge,
              enabled: formData.enabled !== false
            })
          } else {
            // 编辑工具 - 找到分类的数据库 ID
            const category = props.categoryOptions.find((c) => c.id === formData.category)
            await toolsStore.updateTool(formData.id!, {
              ...formData,
              categoryId: category?.dbId
            })
          }

          emit('success')
          handleClose()
        } catch (error) {
          console.error('Submit error:', error)
        } finally {
          submitting.value = false
        }
      }
    })
  }
</script>
