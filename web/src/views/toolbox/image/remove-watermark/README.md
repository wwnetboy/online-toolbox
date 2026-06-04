# 图片去水印功能

## 技术实现

本功能基于 [inpaint-web](https://github.com/lxfater/inpaint-web) 项目集成，使用以下技术：

### 核心技术栈
- **ONNX Runtime Web**: 在浏览器中运行 AI 模型
- **MI-GAN 模型**: 来自 [Picsart-AI-Research](https://github.com/Picsart-AI-Research/MI-GAN) 的图像修复模型
- **WebAssembly**: 高性能计算（注：MI-GAN 模型需要 uint8 输入，WebGPU 不支持某些 uint8 操作，因此使用 WASM）
- **OpenCV.js**: 图像预处理和后处理（未使用，保留接口）

### 模型信息
- **模型名称**: migan_pipeline_v2.onnx
- **模型大小**: 约 50MB
- **模型来源**: https://huggingface.co/andraniksargsyan/migan
- **首次使用**: 需要下载模型，会显示下载进度

### 功能特点
1. **完全本地处理**: 所有计算在浏览器中完成，保护用户隐私
2. **AI 驱动**: 使用深度学习模型智能修复图像
3. **多线程支持**: 在支持的浏览器中使用多线程加速（自动检测 CPU 核心数）
4. **SIMD 优化**: 利用 SIMD 指令集提升性能
5. **实时进度**: 显示下载和处理进度
6. **自动优化**: 根据浏览器能力自动选择最佳执行策略

### 使用流程
1. 上传图片（支持 JPG/PNG/WEBP，最大 20MB）
2. 使用画笔标记需要去除的水印区域
   - 可调整画笔大小（10-100px）
   - 支持撤销/重做操作
3. 点击"去除水印"按钮
4. 等待 AI 处理
   - 首次使用需下载约 50MB 模型
   - 处理时间取决于图片大小和硬件性能
5. 下载处理后的图片

### 浏览器兼容性
- **推荐**: Chrome/Edge/Firefox 最新版（支持 WebAssembly + SIMD + 多线程）
- Safari 最新版（支持 WebAssembly）
- 需要支持 WebAssembly

### 性能说明
本功能使用 WebAssembly 执行提供者（而非 WebGPU），原因是 MI-GAN 模型需要 uint8 数据类型输入，而 WebGPU 不支持某些 uint8 操作（如 GatherND）。

性能优化策略：
- **多线程**: 自动检测并使用所有可用 CPU 核心
- **SIMD**: 利用 SIMD 指令集加速向量运算
- **内存优化**: 模型加载后缓存在内存中，避免重复下载

处理时间示例（1920x1080 图片）：
- WebAssembly (多线程 + SIMD): 15-30 秒
- WebAssembly (单线程): 30-60 秒

实际处理时间取决于：
- CPU 性能和核心数
- 图片尺寸和复杂度
- 标记区域大小

### 常见问题

**Q: 首次使用为什么这么慢？**
A: 需要下载约 50MB 的 AI 模型，下载完成后会缓存在浏览器中，后续使用会很快。

**Q: 处理失败怎么办？**
A: 
- 检查网络连接（首次使用需要下载模型）
- 尝试减小标记区域
- 使用更小的图片
- 刷新页面重试

**Q: 支持哪些浏览器？**
A: 所有支持 WebAssembly 的现代浏览器。推荐使用支持多线程和 SIMD 的浏览器（如 Chrome、Edge、Firefox）以获得最佳性能。

**Q: 数据安全吗？**
A: 完全安全，所有处理都在浏览器本地完成，图片不会上传到服务器。

### 致谢
- [inpaint-web](https://github.com/lxfater/inpaint-web) - 原始项目
- [MI-GAN](https://github.com/Picsart-AI-Research/MI-GAN) - AI 模型
- [ONNX Runtime](https://onnxruntime.ai/) - 推理引擎

### 开发说明

如需调试，可在浏览器控制台查看日志：
- `[Inpaint]` 开头的日志显示模型加载和推理信息
- 包含处理时间等性能指标

