<!-- 用户反馈管理页面 -->
<template>
  <div class="feedback-page art-full-height">
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
            <ElButton type="success" :disabled="!selectedRows.length" @click="batchResolve">
              批量标记已解决
            </ElButton>
            <ElButton type="danger" :disabled="!selectedRows.length" @click="batchDelete">
              批量删除
            </ElButton>
          </ElSpace>
        </div>
        <div class="right flex items-center gap-2">
          <span class="text-sm text-gray-500"> 共 {{ pagination.total }} 条反馈 </span>
          <ElButton :icon="Refresh" circle @click="loadFeedbackList" />
        </div>
      </div>

      <!-- 表格 -->
      <ElTable
        v-loading="loading"
        :data="feedbackList"
        border
        stripe
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <ElTableColumn type="selection" width="50" align="center" />
        <ElTableColumn type="index" label="序号" width="60" align="center" />
        <ElTableColumn prop="type" label="反馈类型" width="100" align="center">
          <template #default="{ row }">
            <ElTag :type="getTypeTagType(row.type)" size="small">
              {{ getTypeLabel(row.type) }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="toolName" label="相关工具" width="120">
          <template #default="{ row }">
            <ElTag size="small" v-if="row.toolName">{{ row.toolName }}</ElTag>
            <span v-else class="text-gray-400">未指定</span>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="content" label="反馈内容" min-width="300">
          <template #default="{ row }">
            <div class="feedback-content">
              <p class="line-clamp-2">{{ row.content }}</p>
              <ElButton
                v-if="row.content.length > 100"
                type="primary"
                link
                size="small"
                @click="showDetail(row)"
              >
                查看详情
              </ElButton>
            </div>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="contact" label="联系方式" width="150">
          <template #default="{ row }">
            <span v-if="row.contact">{{ row.contact }}</span>
            <span v-else class="text-gray-400">未提供</span>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <ElTag :type="getStatusType(row.status)">
              {{ getStatusLabel(row.status) }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="createdAt" label="反馈时间" width="180" />
        <ElTableColumn label="操作" width="200" fixed="right" align="center">
          <template #default="{ row }">
            <ElButton type="primary" link @click="showDetail(row)">详情</ElButton>
            <ElButton
              v-if="row.status !== 'resolved'"
              type="success"
              link
              @click="handleResolve(row)"
            >
              标记已解决
            </ElButton>
            <ElButton type="danger" link @click="handleDelete(row)">删除</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>

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

    <!-- 详情弹窗 -->
    <ElDialog v-model="detailVisible" title="反馈详情" width="600px">
      <ElDescriptions :column="1" border>
        <ElDescriptionsItem label="反馈ID">{{ currentFeedback?.id }}</ElDescriptionsItem>
        <ElDescriptionsItem label="反馈类型">
          <ElTag :type="getTypeTagType(currentFeedback?.type || '')">
            {{ getTypeLabel(currentFeedback?.type || '') }}
          </ElTag>
        </ElDescriptionsItem>
        <ElDescriptionsItem label="相关工具">
          <ElTag v-if="currentFeedback?.toolName">{{ currentFeedback?.toolName }}</ElTag>
          <span v-else class="text-gray-400">未指定</span>
        </ElDescriptionsItem>
        <ElDescriptionsItem label="反馈内容">
          <div class="whitespace-pre-wrap">{{ currentFeedback?.content }}</div>
        </ElDescriptionsItem>
        <ElDescriptionsItem label="联系方式">
          {{ currentFeedback?.contact || '未提供' }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="反馈状态">
          <ElTag :type="getStatusType(currentFeedback?.status || '')">
            {{ getStatusLabel(currentFeedback?.status || '') }}
          </ElTag>
        </ElDescriptionsItem>
        <ElDescriptionsItem label="反馈时间">
          {{ currentFeedback?.createdAt }}
        </ElDescriptionsItem>
        <ElDescriptionsItem v-if="currentFeedback?.reply" label="回复内容">
          <div class="whitespace-pre-wrap">{{ currentFeedback?.reply }}</div>
        </ElDescriptionsItem>
      </ElDescriptions>

      <template v-if="currentFeedback?.status !== 'resolved'">
        <ElDivider />
        <ElForm label-width="80px">
          <ElFormItem label="回复内容">
            <ElInput
              v-model="replyContent"
              type="textarea"
              :rows="4"
              placeholder="请输入回复内容（可选）"
            />
          </ElFormItem>
        </ElForm>
      </template>

      <template #footer>
        <ElButton @click="detailVisible = false">关闭</ElButton>
        <ElButton
          v-if="currentFeedback?.status !== 'resolved'"
          type="primary"
          @click="handleResolveWithReply"
        >
          标记已解决
        </ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ref, reactive, onMounted } from 'vue'
  import { Refresh } from '@element-plus/icons-vue'
  import { ElMessage, ElMessageBox } from 'element-plus'

  defineOptions({ name: 'FeedbackManage' })

  // 反馈数据类型
  interface Feedback {
    id: string
    type: 'suggestion' | 'bug' | 'other'
    toolId: string
    toolName: string
    content: string
    contact?: string
    status: 'pending' | 'processing' | 'resolved'
    createdAt: string
    reply?: string
  }

  // 反馈类型选项
  const typeOptions = [
    { label: '功能建议', value: 'suggestion' },
    { label: '问题反馈', value: 'bug' },
    { label: '其他', value: 'other' }
  ]

  // 反馈状态选项
  const statusOptions = [
    { label: '待处理', value: 'pending' },
    { label: '处理中', value: 'processing' },
    { label: '已解决', value: 'resolved' }
  ]

  // 搜索表单
  const searchForm = ref<Record<string, any>>({
    type: '',
    status: '',
    toolName: ''
  })

  // 搜索表单配置
  const searchFormItems = computed(() => [
    {
      label: '反馈类型',
      key: 'type',
      type: 'select',
      props: {
        placeholder: '请选择类型',
        clearable: true,
        options: typeOptions
      }
    },
    {
      label: '反馈状态',
      key: 'status',
      type: 'select',
      props: {
        placeholder: '请选择状态',
        clearable: true,
        options: statusOptions
      }
    },
    {
      label: '相关工具',
      key: 'toolName',
      type: 'input',
      placeholder: '请输入工具名称',
      clearable: true
    }
  ])

  // 表格数据
  const loading = ref(false)
  const feedbackList = ref<Feedback[]>([])
  const selectedRows = ref<Feedback[]>([])

  // 分页
  const pagination = reactive({
    current: 1,
    size: 10,
    total: 0
  })

  // 详情弹窗
  const detailVisible = ref(false)
  const currentFeedback = ref<Feedback | null>(null)
  const replyContent = ref('')

  // 模拟数据 + localStorage 数据
  const getStoredFeedbacks = (): Feedback[] => {
    try {
      const stored = localStorage.getItem('user-feedbacks')
      if (stored) {
        const feedbacks = JSON.parse(stored)
        return feedbacks.map((f: any) => ({
          id: f.id,
          toolId: f.toolId || '',
          toolName: f.toolName || '未指定',
          type: f.type || 'suggestion',
          content: f.content,
          contact: f.contact || '',
          status: f.status || 'pending',
          createdAt: f.createdAt ? new Date(f.createdAt).toLocaleString('zh-CN') : '',
          reply: f.reply || ''
        }))
      }
    } catch (e) {
      console.error('读取反馈数据失败', e)
    }
    return []
  }

  // 所有反馈数据（localStorage + 示例数据）
  const allFeedbackData = ref<Feedback[]>([])

  // 初始化数据
  const initFeedbackData = () => {
    const storedFeedbacks = getStoredFeedbacks()
    // 合并 localStorage 数据，新数据在前
    allFeedbackData.value = [...storedFeedbacks].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }

  // 获取状态类型
  const getStatusType = (status: string): 'primary' | 'success' | 'warning' | 'info' | 'danger' => {
    const types: Record<string, 'primary' | 'success' | 'warning' | 'info' | 'danger'> = {
      pending: 'warning',
      processing: 'primary',
      resolved: 'success'
    }
    return types[status] || 'info'
  }

  // 获取状态标签
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: '待处理',
      processing: '处理中',
      resolved: '已解决'
    }
    return labels[status] || status
  }

  // 获取反馈类型标签
  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      suggestion: '功能建议',
      bug: '问题反馈',
      other: '其他'
    }
    return labels[type] || '未知'
  }

  // 获取反馈类型标签颜色
  const getTypeTagType = (type: string): 'primary' | 'success' | 'warning' | 'info' | 'danger' => {
    const types: Record<string, 'primary' | 'success' | 'warning' | 'info' | 'danger'> = {
      suggestion: 'primary',
      bug: 'danger',
      other: 'info'
    }
    return types[type] || 'info'
  }

  // 加载反馈列表
  const loadFeedbackList = () => {
    loading.value = true

    // 重新初始化数据（获取最新的 localStorage 数据）
    initFeedbackData()

    setTimeout(() => {
      let filtered = [...allFeedbackData.value]

      const form = searchForm.value
      if (form.type) {
        filtered = filtered.filter((f) => f.type === form.type)
      }

      if (form.status) {
        filtered = filtered.filter((f) => f.status === form.status)
      }

      if (form.toolName) {
        filtered = filtered.filter((f) =>
          f.toolName?.toLowerCase().includes(form.toolName.toLowerCase())
        )
      }

      pagination.total = filtered.length

      const start = (pagination.current - 1) * pagination.size
      const end = start + pagination.size
      feedbackList.value = filtered.slice(start, end)

      loading.value = false
    }, 300)
  }

  // 搜索
  const handleSearch = () => {
    pagination.current = 1
    loadFeedbackList()
  }

  // 重置
  const handleReset = () => {
    pagination.current = 1
    loadFeedbackList()
  }

  // 分页
  const handleSizeChange = (size: number) => {
    pagination.size = size
    pagination.current = 1
    loadFeedbackList()
  }

  const handleCurrentChange = (current: number) => {
    pagination.current = current
    loadFeedbackList()
  }

  // 选择变化
  const handleSelectionChange = (selection: Feedback[]) => {
    selectedRows.value = selection
  }

  // 显示详情
  const showDetail = (row: Feedback) => {
    currentFeedback.value = row
    replyContent.value = ''
    detailVisible.value = true
  }

  // 标记已解决
  const handleResolve = (row: Feedback) => {
    ElMessageBox.confirm(`确定要将反馈"${row.id}"标记为已解决吗？`, '确认操作', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info'
    })
      .then(() => {
        row.status = 'resolved'
        // 同步到全部数据
        const item = allFeedbackData.value.find((f) => f.id === row.id)
        if (item) {
          item.status = 'resolved'
        }
        saveFeedbacksToStorage()
        ElMessage.success('已标记为已解决')
      })
      .catch(() => {})
  }

  // 带回复的标记已解决
  const handleResolveWithReply = () => {
    if (currentFeedback.value) {
      currentFeedback.value.status = 'resolved'
      if (replyContent.value) {
        currentFeedback.value.reply = replyContent.value
      }
      // 同步到全部数据
      const item = allFeedbackData.value.find((f) => f.id === currentFeedback.value?.id)
      if (item) {
        item.status = 'resolved'
        if (replyContent.value) {
          item.reply = replyContent.value
        }
      }
      saveFeedbacksToStorage()
      ElMessage.success('已标记为已解决')
      detailVisible.value = false
    }
  }

  // 保存反馈数据到 localStorage
  const saveFeedbacksToStorage = () => {
    try {
      localStorage.setItem('user-feedbacks', JSON.stringify(allFeedbackData.value))
    } catch (e) {
      console.error('保存反馈数据失败', e)
    }
  }

  // 删除反馈
  const handleDelete = (row: Feedback) => {
    ElMessageBox.confirm(`确定要删除反馈"${row.id}"吗？此操作不可恢复！`, '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
      .then(() => {
        // 从列表中删除
        const listIndex = feedbackList.value.findIndex((f) => f.id === row.id)
        if (listIndex > -1) {
          feedbackList.value.splice(listIndex, 1)
        }
        // 从全部数据中删除
        const allIndex = allFeedbackData.value.findIndex((f) => f.id === row.id)
        if (allIndex > -1) {
          allFeedbackData.value.splice(allIndex, 1)
        }
        // 同步到 localStorage
        saveFeedbacksToStorage()
        pagination.total--
        ElMessage.success('删除成功')
      })
      .catch(() => {
        ElMessage.info('已取消删除')
      })
  }

  // 批量标记已解决
  const batchResolve = () => {
    ElMessageBox.confirm(
      `确定要将选中的 ${selectedRows.value.length} 条反馈标记为已解决吗？`,
      '批量操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }
    )
      .then(() => {
        selectedRows.value.forEach((row) => {
          row.status = 'resolved'
        })
        ElMessage.success(`已将 ${selectedRows.value.length} 条反馈标记为已解决`)
        selectedRows.value = []
      })
      .catch(() => {})
  }

  // 批量删除
  const batchDelete = () => {
    ElMessageBox.confirm(
      `确定要删除选中的 ${selectedRows.value.length} 条反馈吗？此操作不可恢复！`,
      '批量删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
      .then(() => {
        const ids = selectedRows.value.map((r) => r.id)
        feedbackList.value = feedbackList.value.filter((f) => !ids.includes(f.id))
        allFeedbackData.value = allFeedbackData.value.filter((f) => !ids.includes(f.id))
        // 同步到 localStorage
        saveFeedbacksToStorage()
        pagination.total -= selectedRows.value.length
        ElMessage.success(`已删除 ${selectedRows.value.length} 条反馈`)
        selectedRows.value = []
      })
      .catch(() => {
        ElMessage.info('已取消删除')
      })
  }

  onMounted(() => {
    loadFeedbackList()
  })
</script>

<style scoped lang="scss">
  .feedback-page {
    .feedback-content {
      .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
    }
  }
</style>
