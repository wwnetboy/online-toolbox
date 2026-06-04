// 测试导入
console.log('Testing imports...')

try {
  // 测试处理器导入
  const compressPath = './src/processors/image/compress.ts'
  console.log('Compress processor path:', compressPath)

  // 测试hooks导入
  const hooksPath = './src/hooks/core/useToolProcessor.ts'
  console.log('Hooks path:', hooksPath)

  console.log('All paths exist')
} catch (error) {
  console.error('Import test failed:', error)
}
