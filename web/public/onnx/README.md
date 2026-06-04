# ONNX Runtime WASM 运行时文件

此目录用于存放 onnxruntime-web 的 WASM 运行时文件，供图片去水印功能在本地离线运行。

## 需要的文件

- ort-wasm-simd-threaded.mjs
- ort-wasm-simd-threaded.jsep.mjs
- ort-wasm-simd-threaded.asyncify.mjs
- ort-wasm-simd-threaded.wasm
- ort-wasm-simd-threaded.jsep.wasm
- ort-wasm-simd-threaded.asyncify.wasm

## 同步方式

执行命令：

```
pnpm sync:onnxruntime-wasm
```

## 说明

- 系统强制从本地加载 WASM 运行时，不会联网下载。
- 若缺少文件，会导致模型加载失败。
