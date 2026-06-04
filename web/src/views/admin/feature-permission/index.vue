<!-- 功能权限管理页面 -->
<template>
  <div class="feature-permission-page art-full-height">
    <!-- 分组概览卡片 -->
    <div class="group-overview mb-3">
      <ElRow :gutter="12">
        <ElCol v-for="group in categoryGroups" :key="group.value" :xs="24" :sm="12" :md="6">
          <ElCard
            class="group-card"
            :class="{ active: searchForm.category === group.value }"
            shadow="hover"
            @click="handleGroupCardClick(group.value)"
          >
            <div class="group-card-content">
              <div class="group-header">
                <ElTag :type="getCategoryTagType(group.value)" effect="dark" size="small">
                  {{ group.label }}
                </ElTag>
                <ElDropdown
                  trigger="click"
                  @command="(cmd: string) => handleGroupQuickAction(group.value, cmd)"
                >
                  <ElButton type="primary" link size="small" @click.stop>
                    <ElIcon><MoreFilled /></ElIcon>
                  </ElButton>
                  <template #dropdown>
                    <ElDropdownMenu>
                      <ElDropdownItem command="all-free">全部设为免费</ElDropdownItem>
                      <ElDropdownItem command="all-member">全部设为会员</ElDropdownItem>
                      <ElDropdownItem command="enable-all">全部启用</ElDropdownItem>
                      <ElDropdownItem command="disable-all">全部禁用</ElDropdownItem>
                    </ElDropdownMenu>
                  </template>
                </ElDropdown>
              </div>
              <div class="group-stats">
                <div class="stat-item">
                  <span class="stat-value">{{ getGroupStats(group.value).total }}</span>
                  <span class="stat-label">功能数</span>
                </div>
                <div class="stat-item">
                  <span class="stat-value text-warning">{{
                    getGroupStats(group.value).memberRequired
                  }}</span>
                  <span class="stat-label">需会员</span>
                </div>
                <div class="stat-item">
                  <span class="stat-value text-success">{{ getGroupStats(group.value).free }}</span>
                  <span class="stat-label">免费</span>
                </div>
              </div>
            </div>
          </ElCard>
        </ElCol>
      </ElRow>
    </div>

    <!-- 搜索和分组筛选 -->
    <ArtSearchBar
      v-model="searchForm"
      :items="searchFormItems"
      :show-expand="false"
      :span="6"
      @search="handleSearch"
      @reset="handleReset"
    />

    <ElCard class="art-table-card" shadow="never">
      <!-- 表格头部 -->
      <div class="table-header flex justify-between items-center mb-4">
        <div class="left flex items-center gap-3">
          <span class="text-sm text-gray-500">批量操作：</span>
          <ElButton :disabled="!selectedRows.length" @click="showBatchDialog('member')">
            设置会员要求
          </ElButton>
          <ElButton :disabled="!selectedRows.length" @click="showBatchDialog('trial')">
            设置试用次数
          </ElButton>
          <ElButton :disabled="!selectedRows.length" @click="showBatchDialog('status')">
            设置状态
          </ElButton>
          <ElDivider direction="vertical" />
          <span class="text-sm text-gray-500">按分组批量配置：</span>
          <ElDropdown trigger="click" @command="handleGroupBatchConfig">
            <ElButton>
              分组配置
              <ElIcon class="ml-1"><ArrowDown /></ElIcon>
            </ElButton>
            <template #dropdown>
              <ElDropdownMenu>
                <ElDropdownItem
                  v-for="group in categoryGroups"
                  :key="group.value"
                  :command="group.value"
                >
                  {{ group.label }}
                </ElDropdownItem>
              </ElDropdownMenu>
            </template>
          </ElDropdown>
        </div>
        <div class="right">
          <ElButton :icon="Refresh" circle @click="loadFeatureList" />
        </div>
      </div>

      <!-- 表格 -->
      <ElTable
        ref="tableRef"
        v-loading="loading"
        :data="filteredList"
        border
        stripe
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <ElTableColumn type="selection" width="50" align="center" />
        <ElTableColumn type="index" label="序号" width="60" align="center" />
        <ElTableColumn prop="featureId" label="功能标识" width="160" />
        <ElTableColumn prop="featureName" label="功能名称" min-width="140" />
        <ElTableColumn prop="category" label="分组" width="120">
          <template #default="{ row }">
            <ElTag :type="getCategoryTagType(row.category)">
              {{ getCategoryLabel(row.category) }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="requireMember" label="会员要求" width="100" align="center">
          <template #default="{ row }">
            <ElSwitch v-model="row.requireMember" @change="handleRequireMemberChange(row)" />
          </template>
        </ElTableColumn>
        <ElTableColumn prop="freeTrialCount" label="每日免费次数" width="130" align="center">
          <template #default="{ row }">
            <ElInputNumber
              v-model="row.freeTrialCount"
              :min="0"
              :max="999"
              size="small"
              controls-position="right"
              style="width: 90px"
              @change="handleTrialCountChange(row)"
            />
          </template>
        </ElTableColumn>
        <ElTableColumn prop="enabled" label="状态" width="80" align="center">
          <template #default="{ row }">
            <ElSwitch v-model="row.enabled" @change="handleStatusChange(row)" />
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="100" fixed="right" align="center">
          <template #default="{ row }">
            <ElButton type="primary" link @click="showEditDialog(row)">编辑</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>

      <!-- 统计信息 -->
      <div class="stats-info flex justify-between items-center mt-4 text-sm text-gray-500">
        <span>
          共 {{ featureList.length }} 个功能，
          {{ featureList.filter((f) => f.requireMember).length }} 个需要会员，
          {{ featureList.filter((f) => !f.enabled).length }} 个已禁用
        </span>
        <span v-if="selectedRows.length">已选择 {{ selectedRows.length }} 项</span>
      </div>
    </ElCard>

    <!-- 编辑弹窗 -->
    <ElDialog v-model="editDialogVisible" title="编辑功能权限" width="500px" destroy-on-close>
      <ElForm ref="editFormRef" :model="editForm" :rules="editFormRules" label-width="120px">
        <ElFormItem label="功能标识">
          <ElInput v-model="editForm.featureId" disabled />
        </ElFormItem>
        <ElFormItem label="功能名称" prop="featureName">
          <ElInput v-model="editForm.featureName" placeholder="请输入功能名称" />
        </ElFormItem>
        <ElFormItem label="功能分组" prop="category">
          <ElSelect v-model="editForm.category" placeholder="请选择分组" style="width: 100%">
            <ElOption
              v-for="group in categoryGroups"
              :key="group.value"
              :label="group.label"
              :value="group.value"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="需要会员" prop="requireMember">
          <ElSwitch v-model="editForm.requireMember" />
          <span class="ml-2 text-sm text-gray-500">
            {{ editForm.requireMember ? '仅会员可用' : '所有用户可用' }}
          </span>
        </ElFormItem>
        <ElFormItem label="每日免费次数" prop="freeTrialCount">
          <ElInputNumber
            v-model="editForm.freeTrialCount"
            :min="0"
            :max="999"
            :disabled="!editForm.requireMember"
          />
          <span class="ml-2 text-sm text-gray-500">
            {{ editForm.requireMember ? '非会员每日可免费使用次数' : '免费功能无限制' }}
          </span>
        </ElFormItem>
        <ElFormItem label="启用状态" prop="enabled">
          <ElSwitch v-model="editForm.enabled" />
          <span class="ml-2 text-sm text-gray-500">
            {{ editForm.enabled ? '功能已启用' : '功能已禁用' }}
          </span>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="editDialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="handleEditSubmit">保存</ElButton>
      </template>
    </ElDialog>

    <!-- 批量配置弹窗 -->
    <ElDialog v-model="batchDialogVisible" :title="batchDialogTitle" width="500px" destroy-on-close>
      <ElForm :model="batchForm" label-width="120px">
        <!-- 分组批量配置时显示完整表单 -->
        <template v-if="batchCategory">
          <ElAlert
            :title="`将对「${getCategoryLabel(batchCategory)}」分组下的所有功能生效`"
            type="info"
            :closable="false"
            class="mb-4"
          />
          <ElFormItem label="会员要求">
            <ElRadioGroup v-model="batchForm.requireMember">
              <ElRadio :value="true">需要会员</ElRadio>
              <ElRadio :value="false">免费</ElRadio>
            </ElRadioGroup>
          </ElFormItem>
          <ElFormItem label="每日免费次数">
            <ElInputNumber
              v-model="batchForm.freeTrialCount"
              :min="0"
              :max="999"
              :disabled="!batchForm.requireMember"
            />
            <span class="ml-2 text-sm text-gray-500">
              {{ batchForm.requireMember ? '非会员每日可免费使用次数' : '免费功能无限制' }}
            </span>
          </ElFormItem>
          <ElFormItem label="启用状态">
            <ElRadioGroup v-model="batchForm.enabled">
              <ElRadio :value="true">启用</ElRadio>
              <ElRadio :value="false">禁用</ElRadio>
            </ElRadioGroup>
          </ElFormItem>
        </template>
        <!-- 选择批量配置时显示单项表单 -->
        <template v-else>
          <template v-if="batchType === 'member'">
            <ElFormItem label="会员要求">
              <ElRadioGroup v-model="batchForm.requireMember">
                <ElRadio :value="true">需要会员</ElRadio>
                <ElRadio :value="false">免费</ElRadio>
              </ElRadioGroup>
            </ElFormItem>
          </template>
          <template v-else-if="batchType === 'trial'">
            <ElFormItem label="每日免费次数">
              <ElInputNumber v-model="batchForm.freeTrialCount" :min="0" :max="999" />
            </ElFormItem>
          </template>
          <template v-else-if="batchType === 'status'">
            <ElFormItem label="启用状态">
              <ElRadioGroup v-model="batchForm.enabled">
                <ElRadio :value="true">启用</ElRadio>
                <ElRadio :value="false">禁用</ElRadio>
              </ElRadioGroup>
            </ElFormItem>
          </template>
          <div class="text-sm text-gray-500 mt-2">
            将对已选择的 {{ selectedRows.length }} 个功能生效
          </div>
        </template>
      </ElForm>
      <template #footer>
        <ElButton @click="batchDialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="handleBatchSubmit">确定</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ref, reactive, computed, onMounted } from 'vue'
  import {
    ElMessage,
    ElMessageBox,
    type FormInstance,
    type FormRules,
    type TableInstance
  } from 'element-plus'
  import { Refresh, ArrowDown, MoreFilled } from '@element-plus/icons-vue'
  import {
    fetchAllFeatureConfigs,
    updateFeatureConfig,
    batchUpdateByCategory,
    type FeaturePermission,
    type UpdateFeatureConfigParams
  } from '@/api/permission'

  defineOptions({ name: 'FeaturePermission' })

  /** 功能分组定义 - 需求 1.9 */
  const categoryGroups = [
    { value: 'image', label: '图片工具', description: '图片压缩、转换、裁剪等' },
    { value: 'pdf', label: 'PDF工具', description: 'PDF合并、拆分、转换等' },
    { value: 'utils', label: '实用工具', description: '二维码、Base64、视频提取等' },
    { value: 'video', label: '视频工具', description: '录屏、视频转GIF等' },
  ]

  /** 获取分组标签 */
  const getCategoryLabel = (category: string) => {
    const group = categoryGroups.find((g) => g.value === category)
    return group?.label || category
  }

  /** 获取分组标签类型 */
  const getCategoryTagType = (category: string) => {
    const typeMap: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'info'> = {
      'image': 'primary',
      'pdf': 'success',
      'utils': 'warning',
      'video': 'danger',
    }
    return typeMap[category] || 'info'
  }

  /** 获取分组统计信息 */
  const getGroupStats = (category: string) => {
    const groupFeatures = featureList.value.filter((f) => f.category === category)
    return {
      total: groupFeatures.length,
      memberRequired: groupFeatures.filter((f) => f.requireMember).length,
      free: groupFeatures.filter((f) => !f.requireMember).length,
      enabled: groupFeatures.filter((f) => f.enabled).length,
      disabled: groupFeatures.filter((f) => !f.enabled).length
    }
  }

  // 会员要求选项
  const memberOptions = [
    { label: '需要会员', value: true },
    { label: '免费', value: false }
  ]

  // 状态选项
  const enabledOptions = [
    { label: '启用', value: true },
    { label: '禁用', value: false }
  ]

  // 搜索表单
  const searchForm = ref<Record<string, any>>({
    name: '',
    category: '',
    requireMember: undefined,
    enabled: undefined
  })

  // 搜索表单配置
  const searchFormItems = computed(() => [
    {
      label: '功能名称',
      key: 'name',
      type: 'input',
      placeholder: '请输入功能名称',
      clearable: true
    },
    {
      label: '功能分组',
      key: 'category',
      type: 'select',
      props: {
        placeholder: '全部分组',
        clearable: true,
        options: categoryGroups.map((g) => ({ label: g.label, value: g.value }))
      }
    },
    {
      label: '会员要求',
      key: 'requireMember',
      type: 'select',
      props: {
        placeholder: '全部',
        clearable: true,
        options: memberOptions
      }
    },
    {
      label: '状态',
      key: 'enabled',
      type: 'select',
      props: {
        placeholder: '全部',
        clearable: true,
        options: enabledOptions
      }
    }
  ])

  // 表格数据
  const loading = ref(false)
  const featureList = ref<FeaturePermission[]>([])
  const selectedRows = ref<FeaturePermission[]>([])
  const tableRef = ref<TableInstance>()

  // 过滤后的列表
  const filteredList = computed(() => {
    let list = [...featureList.value]

    const form = searchForm.value
    if (form.name) {
      const keyword = form.name.toLowerCase()
      list = list.filter(
        (f) =>
          f.featureName.toLowerCase().includes(keyword) ||
          f.featureId.toLowerCase().includes(keyword)
      )
    }

    if (form.category) {
      list = list.filter((f) => f.category === form.category)
    }

    if (form.requireMember !== undefined) {
      list = list.filter((f) => f.requireMember === form.requireMember)
    }

    if (form.enabled !== undefined) {
      list = list.filter((f) => f.enabled === form.enabled)
    }

    return list
  })

  // 编辑弹窗
  const editDialogVisible = ref(false)
  const editFormRef = ref<FormInstance>()
  const editForm = reactive<FeaturePermission>({
    featureId: '',
    featureName: '',
    category: '',
    requireMember: false,
    freeTrialCount: 0,
    enabled: true
  })
  const editFormRules: FormRules = {
    featureName: [{ required: true, message: '请输入功能名称', trigger: 'blur' }],
    category: [{ required: true, message: '请选择功能分组', trigger: 'change' }]
  }

  // 批量配置弹窗
  const batchDialogVisible = ref(false)
  const batchType = ref<'member' | 'trial' | 'status'>('member')
  const batchCategory = ref<string>('')
  const batchForm = reactive({
    requireMember: false,
    freeTrialCount: 3,
    enabled: true
  })

  const batchDialogTitle = computed(() => {
    if (batchCategory.value) {
      return `配置「${getCategoryLabel(batchCategory.value)}」分组`
    }
    const titles = {
      member: '批量设置会员要求',
      trial: '批量设置试用次数',
      status: '批量设置状态'
    }
    return titles[batchType.value]
  })

  const saving = ref(false)

  /** 加载功能列表 */
  const loadFeatureList = async () => {
    loading.value = true
    try {
      const data = await fetchAllFeatureConfigs()
      featureList.value = data
    } catch (error) {
      console.error('加载功能列表失败:', error)
      ElMessage.error('加载功能列表失败')
    } finally {
      loading.value = false
    }
  }

  /** 搜索 - 由 computed 自动处理 */
  const handleSearch = () => {}

  /** 重置搜索 - ArtSearchBar 已清空表单字段 */
  const handleReset = () => {}

  /** 点击分组卡片筛选 */
  const handleGroupCardClick = (category: string) => {
    if (searchForm.value.category === category) {
      searchForm.value.category = ''
    } else {
      searchForm.value.category = category
    }
  }

  /** 分组快捷操作 - 需求 1.9 */
  const handleGroupQuickAction = async (category: string, action: string) => {
    const groupLabel = getCategoryLabel(category)
    const actionLabels: Record<string, string> = {
      'all-free': '设为免费',
      'all-member': '设为需要会员',
      'enable-all': '全部启用',
      'disable-all': '全部禁用'
    }

    try {
      await ElMessageBox.confirm(
        `确定要将「${groupLabel}」下的所有功能${actionLabels[action]}吗？`,
        '批量操作确认',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )

      saving.value = true
      let params: Record<string, any> = {}

      switch (action) {
        case 'all-free':
          params = { requireMember: false }
          break
        case 'all-member':
          params = { requireMember: true }
          break
        case 'enable-all':
          params = { enabled: true }
          break
        case 'disable-all':
          params = { enabled: false }
          break
      }

      const result = await batchUpdateByCategory(category, params)
      ElMessage.success(`已更新 ${result.affectedCount} 个功能`)
      await loadFeatureList()
    } catch (error) {
      if (error !== 'cancel') {
        console.error('批量操作失败:', error)
        ElMessage.error('操作失败')
      }
    } finally {
      saving.value = false
    }
  }

  /** 选择变化 */
  const handleSelectionChange = (rows: FeaturePermission[]) => {
    selectedRows.value = rows
  }

  /** 会员要求变化 */
  const handleRequireMemberChange = async (row: FeaturePermission) => {
    try {
      await updateFeatureConfig(row.featureId, { requireMember: row.requireMember })
      ElMessage.success('更新成功')
    } catch (error) {
      console.error('更新失败:', error)
      ElMessage.error('更新失败')
      // 恢复原值
      row.requireMember = !row.requireMember
    }
  }

  /** 试用次数变化 */
  const handleTrialCountChange = async (row: FeaturePermission) => {
    try {
      await updateFeatureConfig(row.featureId, { freeTrialCount: row.freeTrialCount })
      ElMessage.success('更新成功')
    } catch (error) {
      console.error('更新失败:', error)
      ElMessage.error('更新失败')
      await loadFeatureList()
    }
  }

  /** 状态变化 */
  const handleStatusChange = async (row: FeaturePermission) => {
    try {
      await updateFeatureConfig(row.featureId, { enabled: row.enabled })
      ElMessage.success('更新成功')
    } catch (error) {
      console.error('更新失败:', error)
      ElMessage.error('更新失败')
      row.enabled = !row.enabled
    }
  }

  /** 显示编辑弹窗 */
  const showEditDialog = (row: FeaturePermission) => {
    Object.assign(editForm, { ...row })
    editDialogVisible.value = true
  }

  /** 提交编辑 */
  const handleEditSubmit = async () => {
    if (!editFormRef.value) return

    try {
      await editFormRef.value.validate()
      saving.value = true

      const params: UpdateFeatureConfigParams = {
        featureName: editForm.featureName,
        category: editForm.category,
        requireMember: editForm.requireMember,
        freeTrialCount: editForm.freeTrialCount,
        enabled: editForm.enabled
      }

      await updateFeatureConfig(editForm.featureId, params)
      ElMessage.success('保存成功')
      editDialogVisible.value = false
      await loadFeatureList()
    } catch (error) {
      console.error('保存失败:', error)
      ElMessage.error('保存失败')
    } finally {
      saving.value = false
    }
  }

  /** 显示批量配置弹窗 */
  const showBatchDialog = (type: 'member' | 'trial' | 'status') => {
    batchType.value = type
    batchCategory.value = ''
    batchDialogVisible.value = true
  }

  /** 按分组批量配置 */
  const handleGroupBatchConfig = (category: string) => {
    batchType.value = 'member'
    batchCategory.value = category
    batchDialogVisible.value = true
  }

  /** 提交批量配置 */
  const handleBatchSubmit = async () => {
    saving.value = true
    try {
      if (batchCategory.value) {
        // 按分组批量更新 - 更新所有配置项
        const params: Record<string, any> = {
          requireMember: batchForm.requireMember,
          freeTrialCount: batchForm.freeTrialCount,
          enabled: batchForm.enabled
        }

        const result = await batchUpdateByCategory(batchCategory.value, params)
        ElMessage.success(`已更新 ${result.affectedCount} 个功能`)
      } else {
        // 按选择批量更新 - 只更新指定的配置项
        const promises = selectedRows.value.map((row) => {
          const params: UpdateFeatureConfigParams = {}
          if (batchType.value === 'member') {
            params.requireMember = batchForm.requireMember
          } else if (batchType.value === 'trial') {
            params.freeTrialCount = batchForm.freeTrialCount
          } else if (batchType.value === 'status') {
            params.enabled = batchForm.enabled
          }
          return updateFeatureConfig(row.featureId, params)
        })

        await Promise.all(promises)
        ElMessage.success(`已更新 ${selectedRows.value.length} 个功能`)
      }

      batchDialogVisible.value = false
      await loadFeatureList()
      tableRef.value?.clearSelection()
    } catch (error) {
      console.error('批量更新失败:', error)
      ElMessage.error('批量更新失败')
    } finally {
      saving.value = false
    }
  }

  onMounted(() => {
    loadFeatureList()
  })
</script>

<style scoped lang="scss">
  .feature-permission-page {
    .group-overview {
      .group-card {
        cursor: pointer;
        transition: all 0.3s;
        border: 2px solid transparent;

        &:hover {
          transform: translateY(-2px);
        }

        &.active {
          border-color: var(--el-color-primary);
          background-color: var(--el-color-primary-light-9);
        }

        .group-card-content {
          .group-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
          }

          .group-stats {
            display: flex;
            justify-content: space-around;

            .stat-item {
              text-align: center;

              .stat-value {
                display: block;
                font-size: 20px;
                font-weight: 600;
                color: var(--el-text-color-primary);

                &.text-warning {
                  color: var(--el-color-warning);
                }

                &.text-success {
                  color: var(--el-color-success);
                }
              }

              .stat-label {
                font-size: 12px;
                color: var(--el-text-color-secondary);
              }
            }
          }
        }
      }
    }

    .stats-info {
      padding: 8px 0;
      border-top: 1px solid var(--el-border-color-lighter);
    }
  }
</style>
