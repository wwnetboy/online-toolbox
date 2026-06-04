/**
 * Inpaint Worker - 基于 inpaint-web 项目
 * 使用 ONNX Runtime Web
 */

import * as ort from 'onnxruntime-web'

// 日志控制
const DEBUG = false // 生产环境关闭详细日志
const log = (...args: any[]) => {
  if (DEBUG) console.log('[Inpaint Worker]', ...args)
}

// 配置 ONNX Runtime
const ONNX_CDN = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.23.2/dist/'
ort.env.wasm.wasmPaths = ONNX_CDN
ort.env.wasm.numThreads = 1
ort.env.wasm.simd = true
ort.env.wasm.proxy = false

// 抑制 ONNX Runtime 的警告日志
ort.env.logLevel = 'error' // 只显示错误，不显示警告

let session: ort.InferenceSession | null = null
let isModelLoading = false
let modelLoadPromise: Promise<void> | null = null

// 消息处理
self.onmessage = async (e) => {
  const { type, imageData, maskData } = e.data

  if (type === 'preload') {
    // 预加载模型
    try {
      self.postMessage({
        type: 'progress',
        message: '开始预加载模型...'
      })
      await loadModel()
      self.postMessage({
        type: 'success',
        message: '模型预加载完成'
      })
    } catch (error: any) {
      console.error('[Inpaint Worker] Preload error:', error)
      self.postMessage({
        type: 'error',
        message: error.message || '预加载失败'
      })
    }
  } else if (type === 'inpaint') {
    try {
      await processInpaint(imageData, maskData)
    } catch (error: any) {
      console.error('[Inpaint Worker] Error:', error)
      self.postMessage({
        type: 'error',
        message: error.message || '处理失败'
      })
    }
  }
}

async function processInpaint(imageData: ImageData, maskData: ImageData) {
  const startTime = Date.now()

  try {
    // 加载模型
    if (!session) {
      if (isModelLoading && modelLoadPromise) {
        self.postMessage({ type: 'progress', message: '等待模型加载完成...' })
        await modelLoadPromise
      } else if (!isModelLoading) {
        self.postMessage({ type: 'progress', message: '正在准备...' })
        await loadModel()
      }
    } else {
      log('使用已加载的模型')
      self.postMessage({ type: 'progress', message: '正在准备...' })
    }

    self.postMessage({ type: 'progress', message: '正在预处理图像...' })

    const { imageTensor, maskTensor } = await preprocessData(imageData, maskData)

    self.postMessage({ type: 'progress', message: '正在执行 AI 修复（这可能需要几秒到几十秒）...' })

    const feeds: Record<string, ort.Tensor> = {
      [session!.inputNames[0]]: imageTensor,
      [session!.inputNames[1]]: maskTensor
    }

    log('Input shapes:', { image: imageTensor.dims, mask: maskTensor.dims })

    const inferenceStart = Date.now()
    const results = await session!.run(feeds)
    const inferenceTime = ((Date.now() - inferenceStart) / 1000).toFixed(1)

    log(`Inference completed in ${inferenceTime}s`)

    self.postMessage({ type: 'progress', message: '正在生成结果...' })

    const outputTensor = results[session!.outputNames[0]]
    const resultImageData = postprocessData(outputTensor, imageData, maskData)

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1)
    log(`Total processing time: ${totalTime}s`)

    self.postMessage({ type: 'success', result: resultImageData })
  } catch (error: any) {
    console.error('[Inpaint Worker] Processing error:', error)
    throw error
  }
}

async function loadModel() {
  if (isModelLoading) return modelLoadPromise
  if (session) {
    log('模型已加载，跳过重复加载')
    return
  }

  isModelLoading = true
  modelLoadPromise = (async () => {
    try {
      log('开始加载模型...')

      const capabilities = await getCapabilities()

      ort.env.wasm.numThreads = 1
      log('Using single-threaded WASM')

      if (capabilities.simd) {
        ort.env.wasm.simd = true
        log('SIMD enabled')
      }

      ort.env.wasm.proxy = false
      log('Using WASM backend')

      const localModelUrl = '/models/migan_pipeline_v2.onnx'

      self.postMessage({ type: 'progress', message: '正在加载 AI 模型...' })

      log('尝试加载模型:', localModelUrl)

      const response = await fetch(localModelUrl)

      if (!response.ok) {
        throw new Error(
          `本地模型加载失败 (${response.status} ${response.statusText})。请确认模型文件存在于 /public/models 目录，并且开发服务器正在运行。`
        )
      }

      log('使用本地模型文件')

      const modelBuffer = await response.arrayBuffer()

      self.postMessage({ type: 'progress', message: '正在初始化 AI 模型...' })

      session = await ort.InferenceSession.create(modelBuffer, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all', // 启用所有图优化
        executionMode: 'sequential', // 顺序执行模式
        enableCpuMemArena: true, // 启用 CPU 内存池
        enableMemPattern: true // 启用内存模式优化
      })

      log('模型加载成功，已缓存在内存中')
    } catch (error) {
      console.error('[Inpaint Worker] Model loading error:', error)
      session = null
      throw new Error('模型加载失败，请检查模型文件是否存在于 /public/models 目录')
    } finally {
      isModelLoading = false
    }
  })()

  return modelLoadPromise
}

async function getCapabilities() {
  const checkWebGPU = async () => {
    if (!(navigator as any).gpu) {
      return false
    }
    try {
      const adapter = await (navigator as any).gpu.requestAdapter()
      return !!adapter
    } catch {
      return false
    }
  }

  const checkSIMD = async () => {
    try {
      return WebAssembly.validate(
        new Uint8Array([
          0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0,
          253, 15, 253, 98, 11
        ])
      )
    } catch {
      return false
    }
  }

  const checkThreads = async () => {
    try {
      return (
        typeof MessageChannel !== 'undefined' &&
        WebAssembly.validate(
          new Uint8Array([
            0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 5, 4, 1, 3, 1, 1, 10, 11, 1,
            9, 0, 65, 0, 254, 16, 2, 0, 26, 11
          ])
        )
      )
    } catch {
      return false
    }
  }

  return {
    webgpu: await checkWebGPU(),
    wasm: typeof WebAssembly === 'object',
    simd: await checkSIMD(),
    threads: await checkThreads()
  }
}

async function preprocessData(imageData: ImageData, maskData: ImageData) {
  const { width, height } = imageData
  const size = width * height

  const imageArray = new Uint8Array(3 * size)
  const maskArray = new Uint8Array(size)

  const imgData = imageData.data
  const maskDataArray = maskData.data

  // 优化：使用单次遍历处理图像和掩码
  for (let i = 0; i < size; i++) {
    const hwcIdx = i * 4
    const alpha = imgData[hwcIdx + 3]

    // 处理图像数据 (RGB) - CHW 格式
    if (alpha === 0) {
      // 完全透明 -> 白色背景
      imageArray[i] = 255
      imageArray[size + i] = 255
      imageArray[2 * size + i] = 255
    } else if (alpha < 255) {
      // 半透明 -> 与白色背景混合
      const alphaRatio = alpha / 255
      const bgRatio = 1 - alphaRatio
      imageArray[i] = Math.round(imgData[hwcIdx] * alphaRatio + 255 * bgRatio)
      imageArray[size + i] = Math.round(imgData[hwcIdx + 1] * alphaRatio + 255 * bgRatio)
      imageArray[2 * size + i] = Math.round(imgData[hwcIdx + 2] * alphaRatio + 255 * bgRatio)
    } else {
      // 不透明 -> 直接使用原始 RGB
      imageArray[i] = imgData[hwcIdx]
      imageArray[size + i] = imgData[hwcIdx + 1]
      imageArray[2 * size + i] = imgData[hwcIdx + 2]
    }

    // 处理掩码数据（红色通道 > 0 表示需要修复）
    maskArray[i] = maskDataArray[hwcIdx] > 0 ? 0 : 255
  }

  log('Preprocess complete')

  return {
    imageTensor: new ort.Tensor('uint8', imageArray, [1, 3, height, width]),
    maskTensor: new ort.Tensor('uint8', maskArray, [1, 1, height, width])
  }
}

function postprocessData(
  tensor: ort.Tensor,
  originalImage: ImageData,
  maskData: ImageData
): ImageData {
  const data = tensor.data
  const dims = tensor.dims

  // 确定实际的尺寸
  let actualHeight: number, actualWidth: number

  if (dims.length === 4) {
    actualHeight = dims[2] as number
    actualWidth = dims[3] as number
  } else if (dims.length === 3) {
    actualHeight = dims[1] as number
    actualWidth = dims[2] as number
  } else {
    throw new Error(`Unexpected tensor dimensions: ${dims}`)
  }

  const size = actualWidth * actualHeight
  const isFloat = tensor.type === 'float32'

  // 快速检测数据范围
  let maxVal = -Infinity
  for (let i = 0; i < Math.min(100, size); i++) {
    const val = Number(data[i])
    if (val > maxVal) maxVal = val
  }

  const needsScaling = isFloat && maxVal <= 1.0

  log('Postprocess:', { dims, needsScaling, maxVal })

  // 优化：直接创建最终结果，减少中间数组
  const pixels = new Uint8ClampedArray(originalImage.data)
  const maskDataArray = maskData.data
  let replacedPixels = 0
  let validColorPixels = 0

  // 单次遍历完成转换和合并
  for (let i = 0; i < size; i++) {
    const hwcIdx = i * 4
    const isMasked = maskDataArray[hwcIdx] > 0

    if (isMasked) {
      let r = Number(data[i])
      let g = Number(data[size + i])
      let b = Number(data[2 * size + i])

      if (needsScaling) {
        r *= 255
        g *= 255
        b *= 255
      }

      const rVal = Math.min(255, Math.max(0, Math.round(r)))
      const gVal = Math.min(255, Math.max(0, Math.round(g)))
      const bVal = Math.min(255, Math.max(0, Math.round(b)))

      pixels[hwcIdx] = rVal
      pixels[hwcIdx + 1] = gVal
      pixels[hwcIdx + 2] = bVal
      // 保留原始 alpha
      pixels[hwcIdx + 3] = originalImage.data[hwcIdx + 3]

      replacedPixels++

      // 验证是否有有效颜色（不是纯黑或纯白）
      // 采样前 2000 个掩码像素进行验证
      if (replacedPixels <= 2000) {
        if (!(rVal === 0 && gVal === 0 && bVal === 0) && !(rVal === 255 && gVal === 255 && bVal === 255)) {
          validColorPixels++
        }
      }
    }
  }

  // 验证输出有效性 - 放宽验证条件
  const sampledPixels = Math.min(replacedPixels, 2000)
  const validRatio = sampledPixels > 0 ? validColorPixels / sampledPixels : 0

  log('Validation:', { 
    replacedPixels, 
    sampledPixels, 
    validColorPixels, 
    validRatio: (validRatio * 100).toFixed(2) + '%' 
  })

  // 只有当有效颜色像素比例极低时才认为输出无效
  if (replacedPixels > 100 && validRatio < 0.01) {
    console.error('[Inpaint] Model output appears invalid (valid ratio:', validRatio, '). Returning original image')
    return new ImageData(new Uint8ClampedArray(originalImage.data), actualWidth, actualHeight)
  }

  log('Merge complete:', { replacedPixels, ratio: ((replacedPixels / size) * 100).toFixed(2) + '%' })

  return new ImageData(pixels, actualWidth, actualHeight)
}

export {}
