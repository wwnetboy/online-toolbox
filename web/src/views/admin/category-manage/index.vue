<template>
  <div class="category-manage-page art-full-height">
    <ElCard shadow="never" class="art-table-card">
      <!-- 表格头部 -->
      <ArtTableHeader
        v-model:columns="columnChecks"
        :loading="loading"
        layout="refresh"
        @refresh="loadCategories"
      >
        <template #left>
          <ElSpace wrap>
            <ElButton type="primary" @click="showAddDialog" v-ripple>新增分类</ElButton>
            <ElButton @click="handleResetData" v-ripple>重置为默认</ElButton>
          </ElSpace>
        </template>
      </ArtTableHeader>

      <!-- 可拖拽排序的表格 -->
      <VueDraggable
        v-model="categoryList"
        target="tbody"
        :animation="150"
        handle=".drag-handle"
        @end="handleDragEnd"
      >
        <ArtTable
          :loading="loading"
          :data="categoryList"
          :columns="columns"
          :show-table-header="true"
          row-key="id"
        >
          <!-- 拖拽手柄列 -->
          <template #drag>
            <div class="drag-handle cursor-move flex-cc">
              <ArtSvgIcon icon="ri:drag-move-2-fill" class="text-lg text-g-500" />
            </div>
          </template>

          <!-- 图标列 - 和前台菜单一致的样式 -->
          <template #icon="{ row }">
            <ArtSvgIcon :icon="row.icon" class="text-xl text-theme" />
          </template>

          <!-- 状态列 -->
          <template #enabled="{ row }">
            <ElSwitch v-model="row.enabled" @change="handleStatusChange(row)" />
          </template>
        </ArtTable>
      </VueDraggable>
    </ElCard>

    <!-- 编辑弹窗 -->
    <ElDialog
      v-model="dialogVisible"
      :title="dialogType === 'add' ? '新增分类' : '编辑分类'"
      width="500px"
      destroy-on-close
      @closed="handleDialogClosed"
    >
      <ArtForm
        ref="formRef"
        v-model="formData"
        :items="formItems"
        :rules="formRules"
        :span="24"
        label-width="80px"
        :show-reset="false"
        :show-submit="false"
      >
        <!-- 图标输入框自定义插槽 -->
        <template #icon>
          <ElInput v-model="formData.icon" placeholder="如：ri:image-fill">
            <template #prepend>
              <ArtSvgIcon :icon="formData.icon || 'ri:folder-line'" :size="18" />
            </template>
          </ElInput>
          <div class="text-xs text-gray-400 mt-1">
            图标库：<a
              href="https://icon-sets.iconify.design/ri/"
              target="_blank"
              class="text-primary"
              >Remix Icon</a
            >
          </div>
        </template>
      </ArtForm>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" @click="handleSubmit">确定</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ref, reactive, computed, onMounted, h } from 'vue'
  import { ElMessage, ElMessageBox, type FormRules } from 'element-plus'
  import { VueDraggable } from 'vue-draggable-plus'
  import { useToolsStore, type ToolCategory } from '@/store/modules/toolbox'
  import { updateCategorySort } from '@/api/tools'
  import ArtTableHeader from '@/components/core/tables/art-table-header/index.vue'
  import ArtTable from '@/components/core/tables/art-table/index.vue'
  import ArtForm, { type FormItem } from '@/components/core/forms/art-form/index.vue'
  import ArtButtonMore from '@/components/core/forms/art-button-more/index.vue'
  import type { ButtonMoreItem } from '@/components/core/forms/art-button-more/index.vue'
  import type { ColumnOption } from '@/types'

  defineOptions({ name: 'CategoryManage' })

  const toolsStore = useToolsStore()

  // 系统内置分类（不可删除）
  const systemCategories = ['image', 'pdf', 'document', 'video', 'utils']
  const isSystemCategory = (id: string) => systemCategories.includes(id)

  // 表格数据
  const loading = ref(false)
  const categoryList = ref<ToolCategory[]>([])

  // 表格列配置
  const columns = computed<ColumnOption[]>(() => [
    { prop: 'drag', label: '', width: 50, align: 'center', useSlot: true },
    { type: 'globalIndex', label: '序号', width: 60, align: 'center' },
    { prop: 'icon', label: '图标', width: 80, align: 'center', useSlot: true },
    { prop: 'name', label: '分类名称', minWidth: 120 },
    { prop: 'id', label: '分类标识', width: 120 },
    { prop: 'enabled', label: '状态', width: 100, align: 'center', useSlot: true },
    {
      prop: 'operation',
      label: '操作',
      width: 80,
      fixed: 'right',
      align: 'center',
      formatter: (row: ToolCategory) =>
        h(ArtButtonMore, {
          list: [
            { key: 'edit', label: '编辑', icon: 'ri:edit-2-line' },
            {
              key: 'delete',
              label: '删除',
              icon: 'ri:delete-bin-4-line',
              color: '#f56c6c',
              disabled: isSystemCategory(row.id)
            }
          ],
          onClick: (item: ButtonMoreItem) => handleButtonMore(item, row)
        })
    }
  ])

  // 列显示控制
  const columnChecks = ref<ColumnOption[]>([...columns.value])

  // 弹窗相关
  const dialogVisible = ref(false)
  const dialogType = ref<'add' | 'edit'>('add')
  const formRef = ref()
  const formData = reactive<ToolCategory>({
    id: '',
    name: '',
    icon: 'ri:folder-line',
    sort: 1,
    enabled: true
  })

  // 表单项配置
  const formItems = computed<FormItem[]>(() => [
    {
      key: 'id',
      label: '分类标识',
      type: 'input',
      props: {
        placeholder: '请输入分类标识（英文）',
        disabled: dialogType.value === 'edit'
      }
    },
    {
      key: 'name',
      label: '分类名称',
      type: 'input',
      props: { placeholder: '请输入分类名称' }
    },
    {
      key: 'icon',
      label: '图标'
      // 使用插槽自定义渲染
    },
    {
      key: 'enabled',
      label: '启用',
      type: 'switch'
    }
  ])

  // 表单验证规则
  const formRules: FormRules = {
    id: [
      { required: true, message: '请输入分类标识', trigger: 'blur' },
      {
        pattern: /^[a-z][a-z0-9-]*$/,
        message: '只能包含小写字母、数字和连字符，且以字母开头',
        trigger: 'blur'
      }
    ],
    name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }],
    icon: [{ required: true, message: '请输入图标', trigger: 'blur' }]
  }

  // 加载分类列表
  const loadCategories = async () => {
    loading.value = true
    try {
      // 等待 store 数据更新
      await toolsStore.refresh()
      categoryList.value = [...toolsStore.categories].sort((a, b) => a.sort - b.sort)
    } finally {
      loading.value = false
    }
  }

  // 拖拽结束后更新排序
  const handleDragEnd = async () => {
    // 构建批量更新数据
    const items = categoryList.value.map((cat, index) => ({
      id: cat.dbId!,
      sort: index + 1
    }))

    try {
      // 使用批量更新 API
      await updateCategorySort(items)
      // 刷新 store 数据以同步前台
      await toolsStore.refresh()
    } catch (err) {
      console.error('更新排序失败:', err)
      // 恢复原始顺序
      categoryList.value = [...toolsStore.categories].sort((a, b) => a.sort - b.sort)
    }
  }

  // 状态改变
  const handleStatusChange = async (row: ToolCategory) => {
    await toolsStore.updateCategory(row.id, { enabled: row.enabled })
  }

  // 操作按钮点击
  const handleButtonMore = (item: ButtonMoreItem, row: ToolCategory) => {
    switch (item.key) {
      case 'edit':
        showEditDialog(row)
        break
      case 'delete':
        handleDelete(row)
        break
    }
  }

  // 显示新增弹窗
  const showAddDialog = () => {
    dialogType.value = 'add'
    Object.assign(formData, {
      id: '',
      name: '',
      icon: 'ri:folder-line',
      sort: categoryList.value.length + 1,
      enabled: true
    })
    dialogVisible.value = true
  }

  // 显示编辑弹窗
  const showEditDialog = (row: ToolCategory) => {
    dialogType.value = 'edit'
    Object.assign(formData, { ...row })
    dialogVisible.value = true
  }

  // 弹窗关闭后重置表单
  const handleDialogClosed = () => {
    formRef.value?.reset()
  }

  // 提交表单
  const handleSubmit = async () => {
    if (!formRef.value) return

    try {
      await formRef.value.validate()

      if (dialogType.value === 'add') {
        // 检查 ID 是否已存在
        if (toolsStore.categories.some((c) => c.id === formData.id)) {
          ElMessage.error('分类标识已存在')
          return
        }
        // 添加新分类，sort 为当前最大值 + 1
        const maxSort = Math.max(...categoryList.value.map((c) => c.sort), 0)
        await toolsStore.addCategory({ ...formData, sort: maxSort + 1 })
      } else {
        // 更新分类
        await toolsStore.updateCategory(formData.id, {
          name: formData.name,
          icon: formData.icon,
          enabled: formData.enabled
        })
      }

      dialogVisible.value = false
      await loadCategories()
    } catch {
      ElMessage.error('表单校验失败，请检查输入')
    }
  }

  // 删除分类
  const handleDelete = async (row: ToolCategory) => {
    if (isSystemCategory(String(row.id))) {
      ElMessage.warning('系统内置分类不可删除')
      return
    }

    ElMessageBox.confirm(`确定要删除分类"${row.name}"吗？该分类下的工具将不会显示！`, '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
      .then(async () => {
        const success = await toolsStore.deleteCategory(row.id)
        if (success) {
          // 直接从本地列表移除，无需再次请求
          categoryList.value = categoryList.value.filter((c) => c.id !== row.id)
        }
      })
      .catch(() => {})
  }

  // 重置为默认数据
  const handleResetData = async () => {
    ElMessageBox.confirm('确定要重置为默认分类吗？所有修改将丢失！', '重置确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
      .then(async () => {
        const success = await toolsStore.resetToDefault()
        if (success) {
          await loadCategories()
        }
      })
      .catch(() => {})
  }

  onMounted(async () => {
    await toolsStore.initTools()
    // 直接从 store 获取数据，不需要再次 refresh
    categoryList.value = [...toolsStore.categories].sort((a, b) => a.sort - b.sort)
  })
</script>

<style scoped lang="scss">
  .category-manage-page {
    .drag-handle {
      width: 100%;
      height: 100%;

      &:hover {
        .art-svg-icon {
          color: var(--el-color-primary);
        }
      }
    }
  }
</style>
