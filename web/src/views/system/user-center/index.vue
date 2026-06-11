<!-- 个人中心页面 -->
<template>
  <div class="w-full h-full p-0 bg-transparent border-none shadow-none">
    <div class="relative flex-b mt-2.5 max-md:block max-md:mt-1">
      <div class="w-112 mr-5 max-md:w-full max-md:mr-0">
        <div class="art-card-sm relative p-9 pb-6 overflow-hidden text-center">
          <img class="absolute top-0 left-0 w-full h-40 object-cover" src="@imgs/user/bg.webp" />
          <div class="relative z-10 mt-20 mx-auto">
            <div class="relative inline-block">
              <img
                class="w-20 h-20 object-cover border-2 border-white rounded-full cursor-pointer"
                :src="userInfo.avatar || defaultAvatar"
                @click="triggerAvatarUpload"
              />
              <input
                ref="avatarInputRef"
                type="file"
                accept="image/*"
                hidden
                @change="handleAvatarChange"
              />
            </div>
          </div>
          <h2 class="mt-5 text-xl font-normal">{{ userInfo.userName }}</h2>
          <p class="mt-5 text-sm text-g-600">{{ form.nikeName || '暂无昵称' }}</p>

          <div class="w-75 mx-auto mt-7.5 text-left">
            <div class="mt-2.5" v-if="form.email">
              <ArtSvgIcon icon="ri:mail-line" class="text-g-700" />
              <span class="ml-2 text-sm">{{ form.email }}</span>
            </div>
            <div class="mt-2.5" v-if="form.nikeName">
              <ArtSvgIcon icon="ri:user-3-line" class="text-g-700" />
              <span class="ml-2 text-sm">{{ form.nikeName }}</span>
            </div>
            <div class="mt-2.5" v-if="form.address">
              <ArtSvgIcon icon="ri:map-pin-line" class="text-g-700" />
              <span class="ml-2 text-sm">{{ form.address }}</span>
            </div>
            <div class="mt-2.5" v-if="form.mobile">
              <ArtSvgIcon icon="ri:phone-line" class="text-g-700" />
              <span class="ml-2 text-sm">{{ form.mobile }}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="flex-1 overflow-hidden max-md:w-full max-md:mt-3.5">
        <div class="art-card-sm">
          <h1 class="p-4 text-xl font-normal border-b border-g-300">基本设置</h1>

          <ElForm
            :model="form"
            class="box-border p-5 [&>.el-row_.el-form-item]:w-[calc(50%-10px)] [&>.el-row_.el-input]:w-full [&>.el-row_.el-select]:w-full"
            ref="ruleFormRef"
            :rules="rules"
            label-width="86px"
            label-position="top"
          >
            <ElRow>
              <ElFormItem label="账号" prop="realName">
                <ElInput v-model="form.realName" :disabled="!isEdit" />
              </ElFormItem>
              <ElFormItem label="性别" prop="sex" class="ml-5">
                <ElSelect v-model="form.sex" placeholder="Select" :disabled="!isEdit">
                  <ElOption
                    v-for="item in options"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </ElSelect>
              </ElFormItem>
            </ElRow>

            <ElRow>
              <ElFormItem label="昵称" prop="nikeName">
                <ElInput v-model="form.nikeName" :disabled="!isEdit" />
              </ElFormItem>
              <ElFormItem label="邮箱" prop="email" class="ml-5">
                <ElInput v-model="form.email" :disabled="!isEdit" />
              </ElFormItem>
            </ElRow>

            <ElRow>
              <ElFormItem label="手机" prop="mobile">
                <ElInput v-model="form.mobile" :disabled="!isEdit" />
              </ElFormItem>
              <ElFormItem label="地址" prop="address" class="ml-5">
                <ElInput v-model="form.address" :disabled="!isEdit" />
              </ElFormItem>
            </ElRow>

            <div class="flex-c justify-end [&_.el-button]:!w-27.5">
              <ElButton v-if="isEdit" @click="cancelEdit" v-ripple> 取消 </ElButton>
              <ElButton
                type="primary"
                class="w-22.5"
                v-ripple
                @click="handleSaveProfile"
                :loading="saving"
              >
                {{ isEdit ? '保存' : '编辑' }}
              </ElButton>
            </div>
          </ElForm>
        </div>

        <div class="art-card-sm my-5">
          <h1 class="p-4 text-xl font-normal border-b border-g-300">更改密码</h1>

          <ElForm :model="pwdForm" class="box-border p-5" label-width="86px" label-position="top">
            <ElFormItem label="当前密码" prop="password">
              <ElInput
                v-model="pwdForm.password"
                type="password"
                :disabled="!isEditPwd"
                show-password
              />
            </ElFormItem>

            <ElFormItem label="新密码" prop="newPassword">
              <ElInput
                v-model="pwdForm.newPassword"
                type="password"
                :disabled="!isEditPwd"
                show-password
              />
            </ElFormItem>

            <ElFormItem label="确认新密码" prop="confirmPassword">
              <ElInput
                v-model="pwdForm.confirmPassword"
                type="password"
                :disabled="!isEditPwd"
                show-password
              />
            </ElFormItem>

            <div class="flex-c justify-end [&_.el-button]:!w-27.5">
              <ElButton v-if="isEditPwd" @click="cancelEditPwd" v-ripple> 取消 </ElButton>
              <ElButton
                type="primary"
                class="w-22.5"
                v-ripple
                @click="handleSavePassword"
                :loading="savingPwd"
              >
                {{ isEditPwd ? '保存' : '编辑' }}
              </ElButton>
            </div>
          </ElForm>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { useUserStore } from '@/store/modules/user'
  import type { FormInstance, FormRules } from 'element-plus'
  import { ElMessage } from 'element-plus'
  import defaultAvatarImg from '@/assets/images/avatar/login-default-avatar.png'
  import {
    fetchCurrentUserInfo,
    updateUserProfile,
    updateUserPassword,
    uploadAvatar
  } from '@/api/user'

  defineOptions({ name: 'UserCenter' })

  const userStore = useUserStore()
  const userInfo = computed(() => userStore.getUserInfo)

  const isEdit = ref(false)
  const isEditPwd = ref(false)
  const saving = ref(false)
  const savingPwd = ref(false)
  const uploading = ref(false)
  const date = ref('')
  const ruleFormRef = ref<FormInstance>()
  const avatarInputRef = ref<HTMLInputElement>()
  const defaultAvatar = defaultAvatarImg
  const originalForm = ref<any>({})

  /**
   * 用户信息表单
   */
  const form = reactive({
    realName: '',
    nikeName: '',
    email: '',
    mobile: '',
    address: '',
    sex: ''
  })

  /**
   * 密码修改表单
   */
  const pwdForm = reactive({
    password: '',
    newPassword: '',
    confirmPassword: ''
  })

  /**
   * 表单验证规则
   */
  const rules = reactive<FormRules>({
    realName: [
      { required: true, message: '请输入姓名', trigger: 'blur' },
      { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
    ],
    nikeName: [
      { required: true, message: '请输入昵称', trigger: 'blur' },
      { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
    ],
    email: [{ required: true, message: '请输入邮箱', trigger: 'blur' }],
    mobile: [{ required: true, message: '请输入手机号码', trigger: 'blur' }],
    address: [{ required: true, message: '请输入地址', trigger: 'blur' }],
    sex: [{ required: true, message: '请选择性别', trigger: 'blur' }]
  })

  /**
   * 性别选项
   */
  const options = [
    { value: 'male', label: '男' },
    { value: 'female', label: '女' },
    { value: 'unknown', label: '未知' }
  ]

  onMounted(() => {
    getDate()
    loadUserInfo()
  })

  /**
   * 加载用户信息
   */
  const loadUserInfo = async () => {
    try {
      const userData = await fetchCurrentUserInfo()
      const data = userData.data || userData
      console.log('📥 加载用户信息:', data)

      form.realName = data.userName || ''
      form.nikeName = data.nickName || ''
      form.email = data.email || ''
      form.mobile = data.phone || ''
      form.sex = data.gender || 'unknown'
      form.address = data.address || ''

      console.log('📝 表单数据:', form)
    } catch (error) {
      console.error('加载用户信息失败:', error)
      ElMessage.error('加载用户信息失败')
    }
  }

  const getDate = () => {
    const h = new Date().getHours()

    if (h >= 6 && h < 9) date.value = '早上好'
    else if (h >= 9 && h < 11) date.value = '上午好'
    else if (h >= 11 && h < 13) date.value = '中午好'
    else if (h >= 13 && h < 18) date.value = '下午好'
    else if (h >= 18 && h < 24) date.value = '晚上好'
    else date.value = '很晚了，早点睡'
  }

  /**
   * 触发头像上传
   */
  const triggerAvatarUpload = () => {
    avatarInputRef.value?.click()
  }

  /**
   * 处理头像文件选择
   */
  const handleAvatarChange = async (event: Event) => {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      ElMessage.error('请选择图片文件')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      ElMessage.error('图片大小不能超过2MB')
      return
    }

    try {
      uploading.value = true
      const response: any = await uploadAvatar(file)
      const avatarUrl = response.url
      if (avatarUrl) {
        await updateUserProfile({ avatar: avatarUrl })

        // 更新userStore中的用户信息
        const userData: any = await fetchCurrentUserInfo()
        userStore.setUserInfo(userData)

        ElMessage.success('头像上传成功')
      }
    } catch (error: any) {
      ElMessage.error(error.message || '头像上传失败')
    } finally {
      uploading.value = false
      if (target) target.value = ''
    }
  }

  /**
   * 保存用户信息
   */
  const handleSaveProfile = async () => {
    if (!isEdit.value) {
      isEdit.value = true
      return
    }

    try {
      await ruleFormRef.value?.validate()
      saving.value = true

      const saveData = {
        nickName: form.nikeName,
        email: form.email,
        phone: form.mobile,
        gender: form.sex,
        address: form.address
      }
      console.log('💾 保存数据:', saveData)

      await updateUserProfile(saveData)

      // 更新userStore中的用户信息
      const response: any = await fetchCurrentUserInfo()
      const userData = response.data || response
      console.log('✅ 保存后重新加载的数据:', userData)
      userStore.setUserInfo(userData)

      // 重新加载表单数据
      await loadUserInfo()

      ElMessage.success('保存成功')
      isEdit.value = false
    } catch (error: any) {
      console.error('❌ 保存失败:', error)
      if (error !== false) {
        ElMessage.error(error.message || '保存失败')
      }
    } finally {
      saving.value = false
    }
  }

  /**
   * 取消编辑用户信息
   */
  const cancelEdit = () => {
    Object.assign(form, originalForm.value)
    isEdit.value = false
  }

  /**
   * 保存密码
   */
  const handleSavePassword = async () => {
    if (!isEditPwd.value) {
      isEditPwd.value = true
      return
    }

    if (!pwdForm.password || !pwdForm.newPassword) {
      ElMessage.error('请填写完整')
      return
    }

    if (pwdForm.newPassword.length < 6) {
      ElMessage.error('新密码长度不能少于6位')
      return
    }

    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      ElMessage.error('两次输入的密码不一致')
      return
    }

    try {
      savingPwd.value = true
      await updateUserPassword({
        oldPassword: pwdForm.password,
        newPassword: pwdForm.newPassword
      })

      ElMessage.success('密码修改成功')
      pwdForm.password = ''
      pwdForm.newPassword = ''
      pwdForm.confirmPassword = ''
      isEditPwd.value = false
    } catch (error: any) {
      ElMessage.error(error.message || '密码修改失败')
    } finally {
      savingPwd.value = false
    }
  }

  /**
   * 取消编辑密码
   */
  const cancelEditPwd = () => {
    pwdForm.password = ''
    pwdForm.newPassword = ''
    pwdForm.confirmPassword = ''
    isEditPwd.value = false
  }
</script>
