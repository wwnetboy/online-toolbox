# 工具箱核心 Hooks 使用指南

本目录包含工具箱功能的核心组合式函数（Composables）。

## useUpload - 文件上传

提供文件上传相关的功能，包括文件选择、拖拽上传、大小验证、批量上传等。

### 基本使用

```typescript
import { useUpload } from '@/hooks'

// 在组件中使用
const {
  files,
  isDragging,
  hasFiles,
  fileCount,
  totalSizeFormatted,
  handleFileSelect,
  handleDragEnter,
  handleDragLeave,
  handleDragOver,
  handleDrop,
  removeFile,
  clearFiles
} = useUpload({
  accept: '.pdf',
  multiple: true,
  maxSize: 100, // 100MB
  maxCount: 10
})
```

### 模板示例

```vue
<template>
  <div>
    <!-- 文件上传区域 -->
    <div
      class="upload-area"
      :class="{ 'is-dragging': isDragging }"
      @dragenter="handleDragEnter"
      @dragleave="handleDragLeave"
      @dragover="handleDragOver"
      @drop="handleDrop"
      @click="$refs.fileInput.click()"
    >
      <input
        ref="fileInput"
        type="file"
        :accept="accept"
        :multiple="multiple"
        style="display: none"
        @change="handleFileSelect"
      />
      <p>点击或拖拽文件到此处上传</p>
      <p>{{ totalSizeFormatted }}</p>
    </div>

    <!-- 文件列表 -->
    <div v-if="hasFiles" class="file-list">
      <div v-for="file in files" :key="file.id" class="file-item">
        <span>{{ file.name }}</span>
        <span>{{ formatFileSize(file.size) }}</span>
        <button @click="removeFile(file.id)">删除</button>
      </div>
    </div>
  </div>
</template>
```

## useFileProcessor - 文件处理

提供文件处理相关的功能，包括处理进度、错误处理、批量处理逻辑等。

### 基本使用

```typescript
import { useFileProcessor } from '@/hooks'

// 在组件中使用
const {
  status,
  progress,
  isProcessing,
  successCount,
  failedCount,
  processFile,
  processBatch,
  reset
} = useFileProcessor()

// 处理单个文件
const handleProcess = async (file: File) => {
  const result = await processFile(file, async (file, onProgress) => {
    // 处理逻辑
    onProgress?.(50) // 更新进度
    const processedData = await someProcessFunction(file)
    onProgress?.(100)
    return processedData
  })

  if (result.success) {
    console.log('处理成功:', result.data)
  } else {
    console.error('处理失败:', result.error)
  }
}

// 批量处理文件
const handleBatchProcess = async (files: File[]) => {
  const result = await processBatch(files, async (file, onProgress) => {
    // 处理逻辑
    const processedData = await someProcessFunction(file)
    return processedData
  })

  console.log(`成功: ${result.successCount}, 失败: ${result.failedCount}`)
}
```

### 进度显示示例

```vue
<template>
  <div v-if="isProcessing" class="progress-container">
    <el-progress :percentage="progress.progress" />
    <p>
      正在处理: {{ progress.currentFileName }}
      ({{ progress.currentIndex + 1 }}/{{ progress.totalFiles }})
    </p>
    <p v-if="progress.estimatedTime">
      预计剩余时间: {{ progress.estimatedTime }}秒
    </p>
  </div>

  <div v-if="status === 'success'" class="result">
    <p>处理完成！成功 {{ successCount }} 个文件</p>
  </div>

  <div v-if="status === 'error'" class="result">
    <p>处理完成！成功 {{ successCount }} 个，失败 {{ failedCount }} 个</p>
  </div>
</template>
```

## useHistory - 历史记录

提供历史记录相关的功能，包括历史记录存储、查询、清理等。

### 基本使用

```typescript
import { useHistory } from '@/hooks'

// 在组件中使用
const {
  records,
  validRecords,
  sortedRecords,
  statistics,
  addRecord,
  downloadFile,
  clearAllRecords,
  formatDateTime,
  formatFileSize
} = useHistory()

// 添加历史记录
const saveToHistory = (file: File, result: Blob) => {
  const downloadUrl = URL.createObjectURL(result)
  
  addRecord({
    toolId: 'pdf-merge',
    toolName: 'PDF合并',
    fileName: file.name,
    outputFileName: 'merged.pdf',
    fileSize: file.size,
    outputFileSize: result.size,
    processType: '合并',
    downloadUrl
  })
}

// 下载文件
const handleDownload = (recordId: string) => {
  downloadFile(recordId)
}

// 清空历史
const handleClearHistory = () => {
  clearAllRecords()
}
```

### 历史记录列表示例

```vue
<template>
  <div class="history-list">
    <div class="history-header">
      <h3>历史记录 ({{ statistics.total }})</h3>
      <el-button @click="clearAllRecords">清空历史</el-button>
    </div>

    <div v-for="record in sortedRecords" :key="record.id" class="history-item">
      <div class="info">
        <p class="filename">{{ record.outputFileName }}</p>
        <p class="meta">
          {{ record.toolName }} · {{ formatFileSize(record.outputFileSize || 0) }} ·
          {{ formatDateTime(record.createdAt) }}
        </p>
      </div>
      <div class="actions">
        <el-button
          v-if="record.status === 'success'"
          type="primary"
          @click="downloadFile(record.id)"
        >
          下载
        </el-button>
        <el-button @click="removeRecord(record.id)">删除</el-button>
      </div>
    </div>
  </div>
</template>
```

## 完整示例：PDF合并工具

```vue
<template>
  <div class="pdf-merge-tool">
    <!-- 上传区域 -->
    <div
      class="upload-area"
      :class="{ 'is-dragging': isDragging }"
      @dragenter="handleDragEnter"
      @dragleave="handleDragLeave"
      @dragover="handleDragOver"
      @drop="handleDrop"
      @click="$refs.fileInput.click()"
    >
      <input
        ref="fileInput"
        type="file"
        accept=".pdf"
        multiple
        style="display: none"
        @change="handleFileSelect"
      />
      <p>点击或拖拽PDF文件到此处上传</p>
    </div>

    <!-- 文件列表 -->
    <div v-if="hasFiles" class="file-list">
      <div v-for="file in files" :key="file.id" class="file-item">
        <span>{{ file.name }}</span>
        <span>{{ formatFileSize(file.size) }}</span>
        <button @click="removeFile(file.id)">删除</button>
      </div>
    </div>

    <!-- 处理按钮 -->
    <el-button
      v-if="hasFiles && !isProcessing"
      type="primary"
      @click="handleMerge"
    >
      开始合并
    </el-button>

    <!-- 进度显示 -->
    <div v-if="isProcessing" class="progress">
      <el-progress :percentage="progress.progress" />
      <p>{{ progress.currentFileName }}</p>
    </div>

    <!-- 结果显示 -->
    <div v-if="status === 'success'" class="result">
      <p>合并完成！</p>
      <el-button type="primary" @click="handleDownloadResult">下载文件</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useUpload, useFileProcessor, useHistory } from '@/hooks'
import { PDFDocument } from 'pdf-lib'

// 文件上传
const {
  files,
  isDragging,
  hasFiles,
  handleFileSelect,
  handleDragEnter,
  handleDragLeave,
  handleDragOver,
  handleDrop,
  removeFile,
  formatFileSize
} = useUpload({
  accept: '.pdf',
  multiple: true,
  maxSize: 100
})

// 文件处理
const {
  status,
  progress,
  isProcessing,
  processFile
} = useFileProcessor()

// 历史记录
const { addRecord } = useHistory()

// 处理结果
const resultBlob = ref<Blob | null>(null)

// 合并PDF
const handleMerge = async () => {
  if (files.value.length === 0) return

  const result = await processFile(files.value[0].file, async (file, onProgress) => {
    // 这里实现PDF合并逻辑
    onProgress?.(50)
    
    // 使用 pdf-lib 合并PDF
    const mergedPdf = await PDFDocument.create()
    // ... 合并逻辑
    
    onProgress?.(100)
    
    const pdfBytes = await mergedPdf.save()
    return new Blob([pdfBytes], { type: 'application/pdf' })
  })

  if (result.success && result.data) {
    resultBlob.value = result.data
    
    // 保存到历史记录
    addRecord({
      toolId: 'pdf-merge',
      toolName: 'PDF合并',
      fileName: files.value[0].name,
      outputFileName: 'merged.pdf',
      fileSize: files.value[0].size,
      outputFileSize: result.data.size,
      processType: '合并',
      downloadUrl: URL.createObjectURL(result.data)
    })
  }
}

// 下载结果
const handleDownloadResult = () => {
  if (!resultBlob.value) return
  
  const url = URL.createObjectURL(resultBlob.value)
  const link = document.createElement('a')
  link.href = url
  link.download = 'merged.pdf'
  link.click()
  URL.revokeObjectURL(url)
}
</script>
```

## 注意事项

1. **文件大小限制**: 默认单个文件最大100MB，可通过配置调整
2. **错误处理**: 批量处理时，单个文件失败不会中断其他文件的处理
3. **内存管理**: 处理完成后记得释放Blob URL，避免内存泄漏
4. **历史记录**: 历史记录默认保存1小时，过期后自动清理
5. **进度更新**: 处理器函数中调用onProgress更新进度，范围0-100

## 相关文档

- [需求文档](/.kiro/specs/online-toolbox/requirements.md)
- [设计文档](/.kiro/specs/online-toolbox/design.md)
- [任务列表](/.kiro/specs/online-toolbox/tasks.md)
