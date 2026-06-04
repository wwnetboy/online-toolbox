/**
 * 批量为工具页面添加 Blob URL 清理逻辑
 * 防止内存泄漏
 */

const fs = require('fs')
const path = require('path')

// 需要处理的工具页面列表
const toolPages = [
  'src/views/toolbox/image/compress/index.vue',
  'src/views/toolbox/image/convert/index.vue',
  'src/views/toolbox/image/resize/index.vue',
  'src/views/toolbox/image/rotate/index.vue',
  'src/views/toolbox/image/splice/index.vue',
  'src/views/toolbox/image/crop/index.vue',
  'src/views/toolbox/pdf/merge/index.vue',
  'src/views/toolbox/pdf/split/index.vue',
  'src/views/toolbox/pdf/compress/index.vue',
  'src/views/toolbox/pdf/rotate/index.vue',
  'src/views/toolbox/pdf/watermark/index.vue',
  'src/views/toolbox/pdf/encrypt/index.vue',
  'src/views/toolbox/pdf/delete/index.vue',
  'src/views/toolbox/pdf/extract/index.vue',
  'src/views/toolbox/pdf/reorder/index.vue',
  'src/views/toolbox/video/video-to-gif/index.vue',
  'src/views/toolbox/video/screen-record/index.vue',
  'src/views/toolbox/document/image-to-pdf/index.vue',
  'src/views/toolbox/utils/base64/index.vue',
  'src/views/toolbox/utils/qrcode/index.vue'
]

const cleanupCode = `
  // 清理 Blob URLs，防止内存泄漏
  onUnmounted(() => {
    if (processResult.value?.data) {
      // 清理单个文件的 Blob URL
      if (processResult.value.data.blob) {
        URL.revokeObjectURL(URL.createObjectURL(processResult.value.data.blob))
      }
      // 清理多个文件的 Blob URLs
      if (processResult.value.data.files) {
        processResult.value.data.files.forEach((file) => {
          if (file.blob) {
            URL.revokeObjectURL(URL.createObjectURL(file.blob))
          }
        })
      }
    }
  })`

function addBlobCleanup(filePath) {
  const fullPath = path.join(__dirname, '..', filePath)

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  文件不存在: ${filePath}`)
    return false
  }

  let content = fs.readFileSync(fullPath, 'utf-8')

  // 检查是否已经有清理逻辑
  if (content.includes('onUnmounted') && content.includes('revokeObjectURL')) {
    console.log(`✅ 已存在清理逻辑: ${filePath}`)
    return true
  }

  // 检查是否导入了 onUnmounted
  const hasOnUnmounted = content.includes('onUnmounted')

  // 如果没有导入，添加导入
  if (!hasOnUnmounted) {
    // 查找 import { ... } from 'vue' 并添加 onUnmounted
    const vueImportRegex = /import\s+\{([^}]+)\}\s+from\s+['"]vue['"]/
    const match = content.match(vueImportRegex)

    if (match) {
      const imports = match[1].split(',').map((s) => s.trim())
      if (!imports.includes('onUnmounted')) {
        imports.push('onUnmounted')
        const newImport = `import { ${imports.join(', ')} } from 'vue'`
        content = content.replace(vueImportRegex, newImport)
      }
    }
  }

  // 在 </script> 前添加清理代码
  const scriptEndRegex = /<\/script>/
  if (scriptEndRegex.test(content)) {
    content = content.replace(scriptEndRegex, `${cleanupCode}\n</script>`)

    fs.writeFileSync(fullPath, content, 'utf-8')
    console.log(`✅ 已添加清理逻辑: ${filePath}`)
    return true
  } else {
    console.log(`❌ 未找到 </script> 标签: ${filePath}`)
    return false
  }
}

// 执行批量处理
console.log('开始批量添加 Blob URL 清理逻辑...\n')

let successCount = 0
let failCount = 0

toolPages.forEach((filePath) => {
  if (addBlobCleanup(filePath)) {
    successCount++
  } else {
    failCount++
  }
})

console.log(`\n处理完成！`)
console.log(`✅ 成功: ${successCount} 个文件`)
console.log(`❌ 失败: ${failCount} 个文件`)
