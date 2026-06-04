<template>
  <ElDialog
    v-model="dialogVisible"
    :title="dialogType === 'add' ? '添加用户' : '编辑用户'"
    width="500px"
    align-center
  >
    <ElForm ref="formRef" :model="formData" :rules="rules" label-width="80px">
      <ElFormItem label="用户名" prop="userName" v-if="dialogType === 'add'">
        <ElInput v-model="formData.userName" placeholder="请输入用户名" />
      </ElFormItem>
      <ElFormItem label="用户名" v-else>
        <ElInput v-model="formData.userName" disabled />
      </ElFormItem>
      <ElFormItem label="密码" prop="password" v-if="dialogType === 'add'">
        <ElInput
          v-model="formData.password"
          type="password"
          placeholder="请输入密码"
          show-password
        />
      </ElFormItem>
      <ElFormItem label="昵称" prop="nickName">
        <ElInput v-model="formData.nickName" placeholder="请输入昵称" />
      </ElFormItem>
      <ElFormItem label="邮箱" prop="email">
        <ElInput v-model="formData.email" placeholder="请输入邮箱" />
      </ElFormItem>
      <ElFormItem label="手机号" prop="phone">
        <ElInput v-model="formData.phone" placeholder="请输入手机号" maxlength="11" />
      </ElFormItem>
      <ElFormItem label="性别" prop="gender">
        <ElRadioGroup v-model="formData.gender">
          <ElRadio value="male">男</ElRadio>
          <ElRadio value="female">女</ElRadio>
          <ElRadio value="unknown">未知</ElRadio>
        </ElRadioGroup>
      </ElFormItem>
      <ElFormItem label="角色" prop="roleIds">
        <ElSelect v-model="formData.roleIds" multiple placeholder="请选择角色" style="width: 100%">
          <ElOption
            v-for="role in roleList"
            :key="role.roleId"
            :value="role.roleId"
            :label="role.roleName"
          />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="状态" prop="status">
        <ElRadioGroup v-model="formData.status">
          <ElRadio value="active">正常</ElRadio>
          <ElRadio value="inactive">禁用</ElRadio>
        </ElRadioGroup>
      </ElFormItem>
    </ElForm>
    <template #footer>
      <div class="dialog-footer">
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="submitLoading" @click="handleSubmit">提交</ElButton>
      </div>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { fetchGetRoleList } from '@/api/system-manage'
  import request from '@/utils/http'
  import type { FormInstance, FormRules } from 'element-plus'

  interface Props {
    visible: boolean
    type: string
    userData?: Partial<Api.SystemManage.UserListItem>
  }

  interface Emits {
    (e: 'update:visible', value: boolean): void
    (e: 'submit'): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  // 角色列表数据
  const roleList = ref<{ roleId: number; roleName: string; roleCode: string }[]>([])
  const submitLoading = ref(false)

  // 获取角色列表
  const loadRoleList = async () => {
    try {
      const res = await fetchGetRoleList({ current: 1, size: 100 })
      roleList.value = res.records || []
      console.log('🎭 角色列表数据:', roleList.value)
    } catch (error) {
      console.error('获取角色列表失败:', error)
    }
  }

  // 对话框显示控制
  const dialogVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
  })

  const dialogType = computed(() => props.type)

  // 表单实例
  const formRef = ref<FormInstance>()

  // 表单数据
  const formData = reactive({
    userName: '',
    password: '',
    nickName: '',
    email: '',
    phone: '',
    gender: 'unknown' as 'male' | 'female' | 'unknown',
    roleIds: [] as number[],
    status: 'active' as 'active' | 'inactive'
  })

  // 表单验证规则
  const rules: FormRules = {
    userName: [
      { required: true, message: '请输入用户名', trigger: 'blur' },
      { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' },
      { pattern: /^[a-zA-Z0-9_]+$/, message: '只能包含字母、数字和下划线', trigger: 'blur' }
    ],
    password: [
      { required: true, message: '请输入密码', trigger: 'blur' },
      { min: 6, max: 100, message: '长度在 6 到 100 个字符', trigger: 'blur' }
    ],
    email: [
      { required: true, message: '请输入邮箱', trigger: 'blur' },
      { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
    ],
    phone: [{ pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号格式', trigger: 'blur' }],
    gender: [{ required: true, message: '请选择性别', trigger: 'change' }],
    status: [{ required: true, message: '请选择状态', trigger: 'change' }]
  }

  /**
   * 初始化表单数据
   */
  const initFormData = () => {
    const isEdit = props.type === 'edit' && props.userData
    const row = props.userData

    if (isEdit && row) {
      console.log('📝 编辑用户数据:', row)
      console.log('🎭 角色IDs:', row.roleIds)

      Object.assign(formData, {
        userName: row.userName || '',
        password: '',
        nickName: row.nickName || '',
        email: row.email || row.userEmail || '',
        phone: row.phone || row.userPhone || '',
        gender: row.gender || row.userGender || 'unknown',
        roleIds: Array.isArray(row.roleIds) ? row.roleIds : [],
        status: row.status || 'active'
      })

      console.log('✅ 表单数据:', formData)
    } else {
      Object.assign(formData, {
        userName: '',
        password: '',
        nickName: '',
        email: '',
        phone: '',
        gender: 'unknown',
        roleIds: [],
        status: 'active'
      })
    }
  }

  /**
   * 监听对话框状态变化
   */
  watch(
    () => [props.visible, props.type, props.userData],
    ([visible]) => {
      if (visible) {
        loadRoleList()
        initFormData()
        nextTick(() => {
          formRef.value?.clearValidate()
        })
      }
    },
    { immediate: true }
  )

  /**
   * 提交表单
   */
  const handleSubmit = async () => {
    if (!formRef.value) return

    await formRef.value.validate(async (valid) => {
      if (valid) {
        submitLoading.value = true
        try {
          if (dialogType.value === 'add') {
            await request.post({
              url: '/api/user',
              data: formData
            })
            ElMessage.success('添加成功')
          } else {
            const userId = props.userData?.id
            const updateData: any = {
              nickName: formData.nickName || undefined,
              email: formData.email || undefined,
              phone: formData.phone || undefined,
              gender: formData.gender,
              roleIds: formData.roleIds,
              status: formData.status
            }

            // 移除空值字段
            Object.keys(updateData).forEach((key) => {
              if (updateData[key] === undefined || updateData[key] === '') {
                delete updateData[key]
              }
            })

            console.log('💾 提交更新数据:', updateData)

            await request.put({
              url: `/api/user/${userId}`,
              data: updateData
            })
            ElMessage.success('更新成功')
          }
          dialogVisible.value = false
          emit('submit')
        } catch (error: any) {
          ElMessage.error(error.message || '操作失败')
        } finally {
          submitLoading.value = false
        }
      }
    })
  }
</script>
