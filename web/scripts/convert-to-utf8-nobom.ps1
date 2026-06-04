# 将所有 Vue 文件转换为 UTF-8 编码（无 BOM）
$files = Get-ChildItem -Path "src" -Recurse -Filter "*.vue"

$count = 0
foreach ($file in $files) {
    try {
        # 读取文件内容（自动检测编码）
        $content = Get-Content $file.FullName -Raw -Encoding Default
        
        # 以 UTF-8 without BOM 格式写回
        $utf8NoBom = New-Object System.Text.UTF8Encoding $false
        [System.IO.File]::WriteAllText($file.FullName, $content, $utf8NoBom)
        
        $count++
        if ($count % 50 -eq 0) {
            Write-Host "Converted $count files..."
        }
    }
    catch {
        Write-Host "Error converting $($file.FullName): $_" -ForegroundColor Red
    }
}

Write-Host "`nTotal converted: $count files" -ForegroundColor Green
