<!-- 时间范围选择器组件 -->
<template>
  <div class="time-range-selector">
    <el-radio-group v-model="selectedRange" size="small" @change="handleChange">
      <el-radio-button v-for="option in timeRangeOptions" :key="option.value" :value="option.value">
        {{ option.label }}
      </el-radio-button>
    </el-radio-group>
  </div>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import type { StatsTimeRange } from '@/types/stats'

  defineOptions({ name: 'TimeRangeSelector' })

  const { t } = useI18n()

  /**
   * 本地存储键名
   */
  const STORAGE_KEY = 'admin_overview_time_range'

  /**
   * 有效的时间范围值
   */
  const VALID_TIME_RANGES: StatsTimeRange[] = ['today', 'week', 'month', 'year']

  /**
   * 默认时间范围
   */
  const DEFAULT_TIME_RANGE: StatsTimeRange = 'today'

  /**
   * 时间范围选项配置
   */
  const timeRangeOptions = computed<Array<{ value: StatsTimeRange; label: string }>>(() => [
    { value: 'today', label: t('admin.overview.timeRange.today') },
    { value: 'week', label: t('admin.overview.timeRange.week') },
    { value: 'month', label: t('admin.overview.timeRange.month') },
    { value: 'year', label: t('admin.overview.timeRange.year') }
  ])

  /**
   * 组件属性
   */
  interface Props {
    /** 当前选中的时间范围 */
    modelValue?: StatsTimeRange
  }

  const props = withDefaults(defineProps<Props>(), {
    modelValue: undefined
  })

  /**
   * 组件事件
   */
  const emit = defineEmits<{
    /** 更新 v-model 值 */
    (e: 'update:modelValue', value: StatsTimeRange): void
    /** 时间范围变化事件 */
    (e: 'change', value: StatsTimeRange): void
  }>()

  /**
   * 验证时间范围值是否有效
   */
  function isValidTimeRange(value: unknown): value is StatsTimeRange {
    return typeof value === 'string' && VALID_TIME_RANGES.includes(value as StatsTimeRange)
  }

  /**
   * 从本地存储加载时间范围
   */
  function loadFromStorage(): StatsTimeRange {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored && isValidTimeRange(stored)) {
        return stored
      }
    } catch (error) {
      console.warn('[TimeRangeSelector] 从本地存储加载失败:', error)
    }
    return DEFAULT_TIME_RANGE
  }

  /**
   * 保存时间范围到本地存储
   */
  function saveToStorage(value: StatsTimeRange): void {
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch (error) {
      console.warn('[TimeRangeSelector] 保存到本地存储失败:', error)
    }
  }

  /**
   * 获取初始值
   * 优先使用 props.modelValue，否则从本地存储加载
   */
  function getInitialValue(): StatsTimeRange {
    if (props.modelValue && isValidTimeRange(props.modelValue)) {
      return props.modelValue
    }
    return loadFromStorage()
  }

  /**
   * 当前选中的时间范围
   */
  const selectedRange = ref<StatsTimeRange>(getInitialValue())

  /**
   * 处理时间范围变化
   */
  function handleChange(value: string | number | boolean | undefined): void {
    if (isValidTimeRange(value)) {
      saveToStorage(value)
      emit('update:modelValue', value)
      emit('change', value)
    }
  }

  /**
   * 监听 props.modelValue 变化，同步更新内部状态
   */
  watch(
    () => props.modelValue,
    (newValue) => {
      if (newValue && isValidTimeRange(newValue) && newValue !== selectedRange.value) {
        selectedRange.value = newValue
        saveToStorage(newValue)
      }
    }
  )

  /**
   * 组件挂载时，如果 modelValue 未定义，则发出初始值
   */
  onMounted(() => {
    if (props.modelValue === undefined) {
      emit('update:modelValue', selectedRange.value)
    }
  })
</script>

<style scoped lang="scss">
  .time-range-selector {
    display: inline-flex;
    align-items: center;
  }
</style>
