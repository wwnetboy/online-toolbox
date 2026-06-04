# 将所有 Vue 文件转换为 UTF-8 编码（带 BOM）
$files = Get-ChildItem -Path "src" -Recurse -Filter "*.vue"

$count = 0
foreach ($file in $files) {
    try {
        # 读取文件内容（自动检测编码）
        $content = Get-Content $file.FullName -Raw
        
        # 以 UTF-8 with BOM 格式写回
        $utf8Bom = New-Object System.Text.UTF8Encoding $true
        [System.IO.File]::WriteAllText($file.FullName, $content, $utf8Bom)
        
        $count++
        Write-Host "Converted: $($file.FullName)"
    }
    catch {
        Write-Host "Error converting $($file.FullName): $_" -ForegroundColor Red
    }
}

Write-Host "`nTotal converted: $count files" -ForegroundColor Green
