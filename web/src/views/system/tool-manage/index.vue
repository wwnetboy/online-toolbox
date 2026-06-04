<!-- 工具管理页面 -->
<template>
  <div class="tool-manage-page art-full-height">
    <!-- 搜索栏 -->
    <ArtSearchBar
      v-model="searchForm"
      :items="searchFormItems"
      :show-expand="false"
      :span="8"
      @search="handleSearch"
      @reset="handleReset"
    />

    <ElCard class="art-table-card" shadow="never">
      <!-- 表格头部 -->
      <div class="table-header flex justify-between items-center mb-4">
        <div class="left">
          <ElButton type="primary" @click="showAddDialog">新增工具</ElButton>
          <ElButton @click="handleResetData">重置为默认</ElButton>
        </div>
        <div class="right">
          <ElButton :icon="Refresh" circle @click="loadToolList" />
        </div>
      </div>

      <!-- 可拖拽排序的表格 -->
      <VueDraggable
        v-model="toolList"
        target="tbody"
        :animation="150"
        handle=".drag-handle"
        @end="handleDragEnd"
      >
        <ElTable v-loading="loading" :data="toolList" border stripe style="width: 100%" row-key="id">
          <!-- 拖拽手柄列 -->
          <ElTableColumn label="" width="44" align="center">
            <template #default>
              <div class="drag-handle cursor-move flex-cc">
                <Icon icon="ri:drag-move-2-fill" :size="18" class="text-gray-400" />
              </div>
            </template>
          </ElTableColumn>
          <ElTableColumn type="index" label="序号" width="60" align="center" />
        <ElTableColumn prop="icon" label="图标" width="80" align="center">
          <template #default="{ row }">
            <div class="tool-icon">
              <img
                v-if="row.iconUrl"
                :src="getIconUrl(row.iconUrl)"
                class="icon-image"
                :alt="row.name"
                @error="(e) => handleImageError(e, row)"
              />
              <Icon v-else :icon="row.icon || 'ri:tools-line'" :size="18" />
            </div>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="name" label="工具名称" min-width="120" />
        <ElTableColumn prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <ElTableColumn prop="category" label="分类" width="120">
          <template #default="{ row }">
            <ElTag>{{ getCategoryLabel(row.category) }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="badge" label="标签" width="120" align="center">
          <template #default="{ row }">
            <div class="badge-selector">
              <ElTag
                v-if="row.badge === 'hot'"
                type="danger"
                effect="dark"
                size="small"
                closable
                @close="handleBadgeClear(row)"
              >
                热门
              </ElTag>
              <ElTag
                v-else-if="row.badge === 'new'"
                type="success"
                effect="dark"
                size="small"
                closable
                @close="handleBadgeClear(row)"
              >
                新
              </ElTag>
              <ElDropdown
                v-else
                trigger="click"
                @command="(cmd: string) => handleBadgeSelect(row, cmd)"
              >
                <ElButton size="small" type="info" plain> 设置标签 </ElButton>
                <template #dropdown>
                  <ElDropdownMenu>
                    <ElDropdownItem command="hot">
                      <ElTag type="danger" effect="dark" size="small">热门</ElTag>
                    </ElDropdownItem>
                    <ElDropdownItem command="new">
                      <ElTag type="success" effect="dark" size="small">新</ElTag>
                    </ElDropdownItem>
                  </ElDropdownMenu>
                </template>
              </ElDropdown>
            </div>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="enabled" label="状态" width="80" align="center">
          <template #default="{ row }">
            <ElSwitch v-model="row.enabled" @change="handleStatusChange(row)" />
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="120" fixed="right" align="center">
          <template #default="{ row }">
            <ElButton type="primary" link @click="showEditDialog(row)">编辑</ElButton>
            <ElButton type="danger" link @click="handleDelete(row)">删除</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
      </VueDraggable>

      <!-- 分页 -->
      <div class="pagination-wrapper flex justify-end mt-4">
        <ElPagination
          v-model:current-page="pagination.current"
          v-model:page-size="pagination.size"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </ElCard>

    <!-- 编辑弹窗 -->
    <ToolEditDialog
      v-model="dialogVisible"
      :dialog-type="dialogType"
      :tool-data="currentTool"
      :category-options="categoryOptions"
      @success="loadToolList"
    />
  </div>
</template>

<script setup lang="ts">
  import { ref, reactive, onMounted, computed } from 'vue'
  import { Refresh } from '@element-plus/icons-vue'
  import { ElMessageBox } from 'element-plus'
  import { Icon } from '@iconify/vue'
  import { VueDraggable } from 'vue-draggable-plus'
  import ToolEditDialog from './modules/tool-edit-dialog.vue'
  import { useToolsStore, type ManagedTool } from '@/store/modules/toolbox'
  import { updateToolSort } from '@/api/tools'

  defineOptions({ name: 'ToolManage' })

  const toolsStore = useToolsStore()

  // 分类选项
  const categoryOptions = computed(() => toolsStore.categories)

  // 状态选项
  const enabledOptions = [
    { label: '启用', value: true },
    { label: '禁用', value: false }
  ]

  // 搜索表单
  const searchForm = ref<Record<string, any>>({
    name: '',
    category: '',
    enabled: undefined
  })

  // 搜索表单配置
  const searchFormItems = computed(() => [
    {
      label: '工具名称',
      key: 'name',
      type: 'input',
      placeholder: '请输入工具名称',
      clearable: true
    },
    {
      label: '分类',
      key: 'category',
      type: 'select',
      props: {
        placeholder: '请选择分类',
        clearable: true,
        options: categoryOptions.value.map((cat) => ({ label: cat.name, value: cat.id }))
      }
    },
    {
      label: '状态',
      key: 'enabled',
      type: 'select',
      props: {
        placeholder: '请选择状态',
        clearable: true,
        options: enabledOptions
      }
    }
  ])

  // 表格数据
  const loading = ref(false)
  const toolList = ref<ManagedTool[]>([])

  // 分页
  const pagination = reactive({
    current: 1,
    size: 10,
    total: 0
  })

  // 弹窗相关
  const dialogVisible = ref(false)
  const dialogType = ref<'add' | 'edit'>('add')
  const currentTool = ref<Partial<ManagedTool>>({})

  // 获取分类标签
  const getCategoryLabel = (category: string) => {
    const cat = categoryOptions.value.find((c) => c.id === category)
    return cat?.name || category
  }

  // 获取图标URL
  const getIconUrl = (iconUrl: string | null) => {
    if (!iconUrl) return ''
    // 如果是完整 URL，直接使用
    if (iconUrl.startsWith('http://') || iconUrl.startsWith('https://')) {
      return iconUrl
    }
    // 如果是相对路径，直接使用（不添加 /api 前缀）
    return iconUrl
  }

  // 图片加载失败处理
  const handleImageError = (event: Event, row: ManagedTool) => {
    console.error('图标加载失败:', row.name, row.iconUrl)
    // 图片加载失败时，清空 iconUrl，显示默认图标
    row.iconUrl = null
  }

  // 加载工具列表
  const loadToolList = () => {
    loading.value = true

    setTimeout(() => {
      // 从 store 获取所有工具
      let filtered = [...toolsStore.allTools]

      // 应用搜索过滤
      const form = searchForm.value
      if (form.name) {
        filtered = filtered.filter((t) =>
          t.name.toLowerCase().includes(form.name.toLowerCase())
        )
      }

      if (form.category) {
        filtered = filtered.filter((t) => t.category === form.category)
      }

      if (form.enabled !== undefined) {
        filtered = filtered.filter((t) => t.enabled === form.enabled)
      }

      pagination.total = filtered.length

      // 分页
      const start = (pagination.current - 1) * pagination.size
      const end = start + pagination.size
      toolList.value = filtered.slice(start, end)

      loading.value = false
    }, 200)
  }

  // 搜索
  const handleSearch = () => {
    pagination.current = 1
    loadToolList()
  }

  // 重置
  const handleReset = () => {
    pagination.current = 1
    loadToolList()
  }

  // 分页大小改变
  const handleSizeChange = (size: number) => {
    pagination.size = size
    pagination.current = 1
    loadToolList()
  }

  // 当前页改变
  const handleCurrentChange = (current: number) => {
    pagination.current = current
    loadToolList()
  }

  // 拖拽结束更新排序
  const handleDragEnd = async () => {
    const startIndex = (pagination.current - 1) * pagination.size
    const items = toolList.value.map((tool, index) => ({
      id: tool.id,
      sort: startIndex + index + 1
    }))

    try {
      await updateToolSort(items)
      await toolsStore.refresh()
      loadToolList()
    } catch {
      // 恢复原始顺序
      loadToolList()
    }
  }

  // 状态改变
  const handleStatusChange = async (row: ManagedTool) => {
    await toolsStore.toggleToolEnabled(row.id)
    loadToolList()
  }

  // 选择标签
  const handleBadgeSelect = async (row: ManagedTool, badge: string) => {
    row.badge = badge as 'hot' | 'new'
    await toolsStore.updateTool(row.id, { badge: row.badge })
    loadToolList()
  }

  // 清除标签
  const handleBadgeClear = async (row: ManagedTool) => {
    row.badge = undefined
    await toolsStore.updateTool(row.id, { badge: null as any })
    loadToolList()
  }

  // 显示新增弹窗
  const showAddDialog = () => {
    dialogType.value = 'add'
    currentTool.value = {
      enabled: true
    }
    dialogVisible.value = true
  }

  // 显示编辑弹窗
  const showEditDialog = (row: ManagedTool) => {
    dialogType.value = 'edit'
    currentTool.value = { ...row }
    dialogVisible.value = true
  }

  // 删除工具
  const handleDelete = async (row: ManagedTool) => {
    ElMessageBox.confirm(`确定要删除工具"${row.name}"吗？此操作不可恢复！`, '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
      .then(async () => {
        await toolsStore.deleteTool(row.id)
        loadToolList()
      })
      .catch(() => {
        // 用户取消操作
      })
  }

  // 重置为默认数据
  const handleResetData = async () => {
    ElMessageBox.confirm('确定要重置为默认工具数据吗？所有修改将丢失！', '重置确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
      .then(async () => {
        await toolsStore.resetToDefault()
        loadToolList()
      })
      .catch(() => {
        // 用户取消操作
      })
  }

  onMounted(async () => {
    await toolsStore.initTools()
    loadToolList()
  })
</script>

<style scoped lang="scss">
  .tool-manage-page {
    .drag-handle {
      width: 100%;
      height: 100%;

      &:hover {
        color: var(--el-color-primary);
      }
    }

    .tool-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      overflow: hidden;
      background: var(--el-fill-color-lighter);
      border-radius: 8px;

      .icon-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    .badge-selector {
      display: flex;
      align-items: center;
      justify-content: center;

      :deep(.el-tag) {
        cursor: pointer;
      }
    }
  }
</style>
