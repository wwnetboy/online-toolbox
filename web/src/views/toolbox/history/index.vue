<!-- 历史记录页面 -->
<template>
  <div class="history-page art-full-height">
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
          <ElSpace>
            <ElButton type="warning" :disabled="statistics.expired === 0" @click="cleanExpired">
              <ElIcon class="mr-1"><Clock /></ElIcon>
              清理过期
            </ElButton>
            <ElButton type="danger" :disabled="records.length === 0" @click="confirmClearAll">
              <ElIcon class="mr-1"><Delete /></ElIcon>
              清空全部
            </ElButton>
          </ElSpace>
        </div>
        <div class="right flex items-center gap-2">
          <span class="text-sm text-gray-500">
            共 {{ statistics.total }} 条记录，{{ statistics.success }} 条可下载
          </span>
          <ElButton :icon="Refresh" circle @click="refreshList" />
        </div>
      </div>

      <!-- 表格 -->
      <ElTable
        v-loading="loading"
        :data="filteredRecords"
        border
        stripe
        style="width: 100%"
        :row-class-name="getRowClassName"
      >
        <ElTableColumn type="index" label="序号" width="60" align="center" />
        <ElTableColumn prop="toolName" label="工具" width="120">
          <template #default="{ row }">
            <ElTag size="small">{{ row.toolName }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="outputFileName" label="文件名" min-width="250">
          <template #default="{ row }">
            <div class="file-name-cell">
              <span class="file-name" :title="row.outputFileName">{{ row.outputFileName }}</span>
            </div>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="outputFileSize" label="大小" width="100" align="center">
          <template #default="{ row }">
            {{ formatFileSize(row.outputFileSize || row.fileSize) }}
          </template>
        </ElTableColumn>
        <ElTableColumn prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <ElTag :type="getStatusType(row.status)" size="small">
              {{ getStatusLabel(row.status) }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="createdAt" label="处理时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="剩余时间" width="120" align="center">
          <template #default="{ row }">
            <span v-if="row.status === 'success' && isDownloadable(row.id)" class="text-warning">
              {{ formatRemainingTime(getRemainingTime(row.id)) }}
            </span>
            <span v-else class="text-gray-400">-</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="150" fixed="right" align="center">
          <template #default="{ row }">
            <ElButton
              v-if="row.status === 'success' && isDownloadable(row.id)"
              type="primary"
              link
              @click="handleDownload(row.id)"
            >
              下载
            </ElButton>
            <ElButton type="danger" link @click="handleDelete(row.id)">删除</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>

      <!-- 空状态 -->
      <div v-if="filteredRecords.length === 0 && !loading" class="empty-state">
        <ElEmpty description="暂无历史记录">
          <template #image>
            <ElIcon class="empty-icon"><FolderOpened /></ElIcon>
          </template>
        </ElEmpty>
      </div>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { Refresh, Delete, Clock, FolderOpened } from '@element-plus/icons-vue'
  import { useHistory } from '@/hooks/core/useHistory'
  import type { HistoryRecord } from '@/store/modules/toolbox/history'

  defineOptions({ name: 'HistoryPage' })

  // 使用历史记录组合式函数
  const {
    sortedRecords: records,
    statistics,
    filterRecords,
    removeRecord,
    clearAllRecords,
    cleanExpiredRecords,
    downloadFile,
    isDownloadable,
    getRemainingTime,
    formatFileSize,
    formatDateTime,
    formatRemainingTime
  } = useHistory()

  const loading = ref(false)

  // 状态选项
  const statusOptions = [
    { label: '可下载', value: 'success' },
    { label: '已过期', value: 'expired' },
    { label: '处理失败', value: 'error' }
  ]

  // 搜索表单
  const searchForm = ref<Record<string, any>>({
    keyword: '',
    status: '',
    toolId: ''
  })

  // 获取可用的工具列表
  const availableTools = computed(() => {
    const toolMap = new Map<string, { id: string; name: string }>()
    records.value.forEach((record: HistoryRecord) => {
      if (!toolMap.has(record.toolId)) {
        toolMap.set(record.toolId, { id: record.toolId, name: record.toolName })
      }
    })
    return Array.from(toolMap.values())
  })

  // 搜索表单配置
  const searchFormItems = computed(() => [
    {
      label: '文件名',
      key: 'keyword',
      type: 'input',
      placeholder: '请输入文件名',
      clearable: true
    },
    {
      label: '状态',
      key: 'status',
      type: 'select',
      props: {
        placeholder: '请选择状态',
        clearable: true,
        options: statusOptions
      }
    },
    {
      label: '工具',
      key: 'toolId',
      type: 'select',
      props: {
        placeholder: '请选择工具',
        clearable: true,
        options: availableTools.value.map((t) => ({ label: t.name, value: t.id }))
      }
    }
  ])

  // 筛选后的记录
  const filteredRecords = computed(() => {
    const form = searchForm.value
    return filterRecords({
      keyword: form.keyword || undefined,
      status: (form.status as HistoryRecord['status']) || undefined,
      toolId: form.toolId || undefined
    })
  })

  // 获取状态类型
  const getStatusType = (status: string): 'success' | 'warning' | 'danger' | 'info' => {
    const types: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
      success: 'success',
      expired: 'warning',
      error: 'danger'
    }
    return types[status] || 'info'
  }

  // 获取状态标签
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      success: '可下载',
      expired: '已过期',
      error: '处理失败'
    }
    return labels[status] || status
  }

  // 获取行样式
  const getRowClassName = ({ row }: { row: HistoryRecord }) => {
    if (row.status === 'expired') return 'row-expired'
    if (row.status === 'error') return 'row-error'
    return ''
  }

  // 搜索 - 由 computed 自动处理
  const handleSearch = () => {}

  // 重置 - ArtSearchBar 已清空表单字段
  const handleReset = () => {}

  // 刷新列表
  const refreshList = () => {
    loading.value = true
    cleanExpiredRecords(false)
    setTimeout(() => {
      loading.value = false
    }, 300)
  }

  // 处理下载
  const handleDownload = (id: string) => {
    downloadFile(id)
  }

  // 处理删除
  const handleDelete = (id: string) => {
    ElMessageBox.confirm('确定要删除这条记录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
      .then(() => {
        removeRecord(id)
        ElMessage.success('删除成功')
      })
      .catch(() => {})
  }

  // 清理过期记录
  const cleanExpired = () => {
    const count = cleanExpiredRecords(true)
    if (count === 0) {
      ElMessage.info('没有需要清理的过期记录')
    }
  }

  // 确认清空全部
  const confirmClearAll = () => {
    ElMessageBox.confirm('确定要清空所有历史记录吗？此操作不可恢复。', '警告', {
      confirmButtonText: '确定清空',
      cancelButtonText: '取消',
      type: 'warning'
    })
      .then(() => {
        clearAllRecords()
        ElMessage.success('已清空所有记录')
      })
      .catch(() => {})
  }

  // 组件挂载时清理过期记录
  onMounted(() => {
    cleanExpiredRecords(false)
  })
</script>

<style scoped lang="scss">
  .history-page {
    .file-name-cell {
      .file-name {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    .empty-state {
      padding: 60px 0;

      .empty-icon {
        font-size: 64px;
        color: var(--el-text-color-placeholder);
      }
    }

    .text-warning {
      color: var(--el-color-warning);
    }

    :deep(.row-expired) {
      opacity: 0.6;
    }

    :deep(.row-error) {
      background-color: var(--el-color-danger-light-9) !important;
    }
  }
</style>
