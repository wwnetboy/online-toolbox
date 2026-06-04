const path = require('path')
const fs = require('fs')

const projectRoot = path.resolve(__dirname, '..')
const sourceDir = path.resolve(projectRoot, 'node_modules', 'onnxruntime-web', 'dist')
const targetDir = path.resolve(projectRoot, 'public', 'onnx')

const files = [
  'ort-wasm-simd-threaded.mjs',
  'ort-wasm-simd-threaded.jsep.mjs',
  'ort-wasm-simd-threaded.asyncify.mjs',
  'ort-wasm-simd-threaded.wasm',
  'ort-wasm-simd-threaded.jsep.wasm',
  'ort-wasm-simd-threaded.asyncify.wasm'
]

if (!fs.existsSync(sourceDir)) {
  console.error('[sync-onnxruntime-wasm] 未找到 onnxruntime-web/dist 目录，请先安装依赖')
  process.exit(1)
}

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true })
}

for (const file of files) {
  const src = path.join(sourceDir, file)
  const dest = path.join(targetDir, file)
  if (!fs.existsSync(src)) {
    console.error(`[sync-onnxruntime-wasm] 缺少文件: ${file}`)
    process.exit(1)
  }
  fs.copyFileSync(src, dest)
  console.log(`[sync-onnxruntime-wasm] 已复制: ${file}`)
}
