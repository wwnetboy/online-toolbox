<!-- 用户管理页面 -->
<!-- art-full-height 自动计算出页面剩余高度 -->
<!-- art-table-card 一个符合系统样式的 class，同时自动撑满剩余高度 -->
<!-- 更多 useTable 使用示例请移步至 功能示例 下面的高级表格示例或者查看官方文档 -->
<!-- useTable 文档：https://www.artd.pro/docs/zh/guide/hooks/use-table.html -->
<template>
  <div class="user-page art-full-height">
    <!-- 搜索栏 -->
    <UserSearch v-model="searchForm" @search="handleSearch" @reset="resetSearchParams"></UserSearch>

    <ElCard class="art-table-card" shadow="never">
      <!-- 表格头部 -->
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElSpace wrap>
            <ElButton @click="showDialog('add')" v-ripple>新增用户</ElButton>
          </ElSpace>
        </template>
      </ArtTableHeader>

      <!-- 表格 -->
      <ArtTable
        :loading="loading"
        :data="data"
        :columns="columns"
        :pagination="pagination"
        @selection-change="handleSelectionChange"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      >
      </ArtTable>

      <!-- 用户弹窗 -->
      <UserDialog
        v-model:visible="dialogVisible"
        :type="dialogType"
        :user-data="currentUserData"
        @submit="handleDialogSubmit"
      />
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  import { useTable } from '@/hooks/core/useTable'
  import { fetchGetUserList } from '@/api/system-manage'
  import request from '@/utils/http'
  import UserSearch from './modules/user-search.vue'
  import UserDialog from './modules/user-dialog.vue'
  import { ElTag, ElMessageBox } from 'element-plus'
  import { DialogType } from '@/types'
  import defaultAvatarImg from '@/assets/images/avatar/login-default-avatar.png'

  defineOptions({ name: 'User' })

  type UserListItem = Api.SystemManage.UserListItem

  // 弹窗相关
  const dialogType = ref<DialogType>('add')
  const dialogVisible = ref(false)
  const currentUserData = ref<Partial<UserListItem>>({})

  // 选中行
  const selectedRows = ref<UserListItem[]>([])

  // 搜索表单
  const searchForm = ref({
    userName: undefined,
    userGender: undefined,
    userPhone: undefined,
    userEmail: undefined,
    status: undefined
  })

  // 用户状态配置 - 匹配后端 active/inactive
  const USER_STATUS_CONFIG = {
    active: { type: 'success' as const, text: '正常' },
    inactive: { type: 'danger' as const, text: '禁用' }
  } as const

  // 性别配置
  const GENDER_CONFIG = {
    male: '男',
    female: '女',
    unknown: '未知'
  } as const

  // 默认头像 - 使用本地图片，避免依赖外部 API
  const DEFAULT_AVATAR = defaultAvatarImg

  /**
   * 获取用户状态配置
   */
  const getUserStatusConfig = (status: string) => {
    return (
      USER_STATUS_CONFIG[status as keyof typeof USER_STATUS_CONFIG] || {
        type: 'info' as const,
        text: '未知'
      }
    )
  }

  /**
   * 获取性别显示文本
   */
  const getGenderText = (gender: string) => {
    return GENDER_CONFIG[gender as keyof typeof GENDER_CONFIG] || '未知'
  }

  const {
    columns,
    columnChecks,
    data,
    loading,
    pagination,
    getData,
    searchParams,
    resetSearchParams,
    handleSizeChange,
    handleCurrentChange,
    refreshData,
    refreshRemove
  } = useTable({
    // 核心配置
    core: {
      apiFn: fetchGetUserList,
      apiParams: {
        current: 1,
        size: 20,
        ...searchForm.value
      },
      // 自定义分页字段映射，未设置时将使用全局配置 tableConfig.ts 中的 paginationKey
      // paginationKey: {
      //   current: 'pageNum',
      //   size: 'pageSize'
      // },
      columnsFactory: () => [
        { type: 'selection' }, // 勾选列
        { type: 'index', width: 60, label: '序号' }, // 序号
        {
          prop: 'avatar',
          label: '头像',
          width: 80,
          align: 'center',
          formatter: (row) => {
            return h('div', { class: 'flex justify-center' }, [
              h('img', {
                class: 'size-10 rounded-md object-cover',
                src: row.avatar || DEFAULT_AVATAR,
                onError: (e: Event) => {
                  const img = e.target as HTMLImageElement
                  if (img.src !== DEFAULT_AVATAR) {
                    img.src = DEFAULT_AVATAR
                  }
                }
              })
            ])
          }
        },
        {
          prop: 'userName',
          label: '用户名',
          width: 150,
          formatter: (row) => {
            return h('div', [
              h('p', { class: 'user-name font-medium' }, row.userName),
              h('p', { class: 'text-xs text-gray-500' }, row.nickName || '-')
            ])
          }
        },
        {
          prop: 'userEmail',
          label: '邮箱',
          width: 200,
          formatter: (row) => row.userEmail || '-'
        },
        {
          prop: 'userGender',
          label: '性别',
          width: 80,
          formatter: (row) => getGenderText(row.userGender)
        },
        {
          prop: 'userPhone',
          label: '手机号',
          width: 130,
          formatter: (row) => row.userPhone || '-'
        },
        {
          prop: 'userRoles',
          label: '角色',
          width: 150,
          formatter: (row) => {
            const roles = row.userRoles || []
            if (roles.length === 0) return h('span', { class: 'text-gray-400' }, '未分配')
            return h(
              'div',
              { class: 'flex flex-wrap gap-1' },
              roles.map((role: string) =>
                h(
                  ElTag,
                  {
                    size: 'small',
                    type: role === 'super_admin' ? 'danger' : role === 'admin' ? 'warning' : 'info'
                  },
                  () => (role === 'super_admin' ? '超级管理员' : role === 'admin' ? '管理员' : role)
                )
              )
            )
          }
        },
        {
          prop: 'status',
          label: '状态',
          width: 80,
          formatter: (row) => {
            const statusConfig = getUserStatusConfig(row.status)
            return h(ElTag, { type: statusConfig.type, size: 'small' }, () => statusConfig.text)
          }
        },
        {
          prop: 'createTime',
          label: '创建时间',
          width: 170,
          sortable: true,
          formatter: (row) => {
            if (!row.createTime) return '-'
            return new Date(row.createTime).toLocaleString('zh-CN')
          }
        },
        {
          prop: 'operation',
          label: '操作',
          width: 120,
          fixed: 'right',
          formatter: (row) =>
            h('div', [
              h(ArtButtonTable, {
                type: 'edit',
                onClick: () => showDialog('edit', row)
              }),
              h(ArtButtonTable, {
                type: 'delete',
                onClick: () => deleteUser(row)
              })
            ])
        }
      ]
    },
    // 数据处理
    transform: {
      // 数据转换器 - 直接使用后端返回的数据
      dataTransformer: (records) => {
        if (!Array.isArray(records)) {
          console.warn('数据转换器: 期望数组类型，实际收到:', typeof records)
          return []
        }
        return records
      }
    }
  })

  /**
   * 搜索处理
   * @param params 参数
   */
  const handleSearch = (params: Record<string, any>) => {
    console.log(params)
    // 搜索参数赋值
    Object.assign(searchParams, params)
    getData()
  }

  /**
   * 显示用户弹窗
   */
  const showDialog = (type: DialogType, row?: UserListItem): void => {
    console.log('打开弹窗:', { type, row })
    dialogType.value = type
    currentUserData.value = row || {}
    nextTick(() => {
      dialogVisible.value = true
    })
  }

  /**
   * 删除用户
   */
  const deleteUser = (row: UserListItem): void => {
    ElMessageBox.confirm(`确定要删除用户 "${row.userName}" 吗？`, '删除用户', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
      .then(async () => {
        try {
          const res = await request.del({ url: `/user/${row.id}` })
          console.log('[删除用户] API响应:', res)
          console.log('[删除用户] 用户ID:', row.id, '用户名:', row.userName)
          ElMessage.success('删除成功')
          await refreshRemove()
          console.log('[删除用户] 刷新后的数据条数:', data.value.length)
        } catch (error: any) {
          console.error('[删除用户] 错误:', error)
          ElMessage.error(error.message || '删除失败')
        }
      })
      .catch(() => {})
  }

  /**
   * 处理弹窗提交事件
   */
  const handleDialogSubmit = async () => {
    try {
      dialogVisible.value = false
      currentUserData.value = {}
      getData() // 刷新列表
    } catch (error) {
      console.error('提交失败:', error)
    }
  }

  /**
   * 处理表格行选择变化
   */
  const handleSelectionChange = (selection: UserListItem[]): void => {
    selectedRows.value = selection
    console.log('选中行数据:', selectedRows.value)
  }
</script>
