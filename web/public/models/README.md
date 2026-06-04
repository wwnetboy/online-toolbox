# AI 模型文件

此目录用于存放图片去水印功能所需的 AI 模型文件。

## 模型文件

### migan_pipeline_v2.onnx

- **用途**: 图片去水印 AI 模型
- **大小**: 约 50MB
- **来源**: [HuggingFace - andraniksargsyan/migan](https://huggingface.co/andraniksargsyan/migan)

## 下载方式

### 方式 1: 本地加载（推荐）

系统强制使用本地模型文件，不进行任何联网下载。请手动放置模型到此目录。

### 手动下载

如果自动下载失败或网络受限，可以手动下载模型文件：

1. 访问 [HuggingFace 模型页面](https://huggingface.co/andraniksargsyan/migan/tree/main)
2. 下载 `migan_pipeline_v2.onnx` 文件
3. 将文件放置到此目录下：`Toolbox/public/models/migan_pipeline_v2.onnx`
4. 重新构建项目

### 使用命令行下载

```bash
# 在项目根目录执行
cd Toolbox/public/models

# Windows (PowerShell)
Invoke-WebRequest -Uri "https://huggingface.co/andraniksargsyan/migan/resolve/main/migan_pipeline_v2.onnx" -OutFile "migan_pipeline_v2.onnx"

# Linux/Mac
curl -L -o migan_pipeline_v2.onnx https://huggingface.co/andraniksargsyan/migan/resolve/main/migan_pipeline_v2.onnx

# 或使用 wget
wget https://huggingface.co/andraniksargsyan/migan/resolve/main/migan_pipeline_v2.onnx
```

## 模型加载策略

系统采用以下加载策略：

1. **仅本地**: 从 `/models/migan_pipeline_v2.onnx` 加载本地模型
2. **内存缓存**: 模型加载后保持在内存中，页面刷新前无需重新加载
3. **预加载**: 页面加载后会自动预加载模型，提升首次使用体验

## 性能优化

- **首次加载**: 10-30 秒（取决于网络速度和设备性能）
- **后续使用**: 2-10 秒（直接使用内存中的模型）
- **预加载**: 页面打开后自动在后台加载，用户使用时模型已就绪

## 注意事项

1. 模型文件较大（约 50MB），请确保有足够的磁盘空间
2. 首次下载需要稳定的网络连接
3. 模型文件不应提交到 Git 仓库（已在 .gitignore 中配置）
4. 生产环境部署时，建议将模型文件放到 CDN 或静态资源服务器

## 故障排除

### 问题: 模型加载失败

**可能原因**:
- 本地模型文件不存在
- 浏览器缓存问题

**解决方案**:
1. 确认模型已放置在 `Toolbox/public/models/migan_pipeline_v2.onnx`
2. 清除浏览器缓存后重试

### 问题: 模型加载很慢

**可能原因**:
- 网络速度慢
- 设备性能较低

**解决方案**:
1. 手动下载模型文件到本地
2. 使用更快的网络连接
3. 等待预加载完成后再使用功能

## 技术细节

- **模型格式**: ONNX (Open Neural Network Exchange)
- **运行时**: ONNX Runtime Web
- **加速**: 支持 WebGPU 和 WebAssembly SIMD
- **架构**: MI-GAN (Mask-Inpainting Generative Adversarial Network)
