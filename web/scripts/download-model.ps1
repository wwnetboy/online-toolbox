# 下载图片去水印 AI 模型
# 用途：将 MI-GAN 模型下载到本地，避免运行时从 CDN 下载

$modelUrl = "https://huggingface.co/andraniksargsyan/migan/resolve/main/migan_pipeline_v2.onnx"
$outputPath = "../public/models/migan_pipeline_v2.onnx"
$modelDir = "../public/models"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "图片去水印 AI 模型下载工具" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查目录是否存在
if (-not (Test-Path $modelDir)) {
    Write-Host "创建模型目录: $modelDir" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $modelDir -Force | Out-Null
}

# 检查文件是否已存在
if (Test-Path $outputPath) {
    $fileSize = (Get-Item $outputPath).Length / 1MB
    Write-Host "模型文件已存在: $outputPath" -ForegroundColor Green
    Write-Host "文件大小: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Green
    Write-Host ""
    
    $overwrite = Read-Host "是否重新下载? (y/N)"
    if ($overwrite -ne "y" -and $overwrite -ne "Y") {
        Write-Host "跳过下载" -ForegroundColor Yellow
        exit 0
    }
    
    Write-Host "删除旧文件..." -ForegroundColor Yellow
    Remove-Item $outputPath -Force
}

Write-Host "开始下载模型文件..." -ForegroundColor Cyan
Write-Host "来源: $modelUrl" -ForegroundColor Gray
Write-Host "目标: $outputPath" -ForegroundColor Gray
Write-Host "大小: 约 50 MB" -ForegroundColor Gray
Write-Host ""

try {
    # 使用 WebClient 下载并显示进度
    $webClient = New-Object System.Net.WebClient
    
    # 注册进度事件
    $progressHandler = {
        param($sender, $e)
        $percent = [math]::Round(($e.BytesReceived / $e.TotalBytesToReceive) * 100, 2)
        $receivedMB = [math]::Round($e.BytesReceived / 1MB, 2)
        $totalMB = [math]::Round($e.TotalBytesToReceive / 1MB, 2)
        
        Write-Progress -Activity "下载模型文件" `
            -Status "$percent% 完成 ($receivedMB MB / $totalMB MB)" `
            -PercentComplete $percent
    }
    
    Register-ObjectEvent -InputObject $webClient -EventName DownloadProgressChanged `
        -SourceIdentifier WebClient.DownloadProgressChanged -Action $progressHandler | Out-Null
    
    # 开始下载
    $webClient.DownloadFileAsync($modelUrl, (Resolve-Path $outputPath -ErrorAction SilentlyContinue).Path)
    
    # 等待下载完成
    while ($webClient.IsBusy) {
        Start-Sleep -Milliseconds 100
    }
    
    # 清理事件
    Unregister-Event -SourceIdentifier WebClient.DownloadProgressChanged -ErrorAction SilentlyContinue
    $webClient.Dispose()
    
    Write-Progress -Activity "下载模型文件" -Completed
    
    # 验证文件
    if (Test-Path $outputPath) {
        $fileSize = (Get-Item $outputPath).Length / 1MB
        Write-Host ""
        Write-Host "✓ 下载完成!" -ForegroundColor Green
        Write-Host "文件大小: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Green
        Write-Host "保存位置: $outputPath" -ForegroundColor Green
        Write-Host ""
        Write-Host "现在可以使用图片去水印功能，无需联网下载模型。" -ForegroundColor Cyan
    } else {
        throw "文件下载后未找到"
    }
    
} catch {
    Write-Host ""
    Write-Host "✗ 下载失败: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "可能的原因:" -ForegroundColor Yellow
    Write-Host "  1. 网络连接问题" -ForegroundColor Gray
    Write-Host "  2. HuggingFace 服务不可用" -ForegroundColor Gray
    Write-Host "  3. 防火墙或代理设置" -ForegroundColor Gray
    Write-Host ""
    Write-Host "解决方案:" -ForegroundColor Yellow
    Write-Host "  1. 检查网络连接" -ForegroundColor Gray
    Write-Host "  2. 使用 VPN 或代理" -ForegroundColor Gray
    Write-Host "  3. 手动从浏览器下载: $modelUrl" -ForegroundColor Gray
    Write-Host "  4. 将下载的文件放到: $outputPath" -ForegroundColor Gray
    
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "提示: 模型文件不会被提交到 Git 仓库" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Cyan
