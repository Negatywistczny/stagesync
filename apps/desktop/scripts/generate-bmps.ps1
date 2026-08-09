Add-Type -AssemblyName System.Drawing

$outDir = Join-Path $PSScriptRoot "..\src-tauri\assets\installer"
if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir | Out-Null
}

function Save-Bmp24([int]$width, [int]$height, [string]$path) {
    # NSIS MUI rejects many 32bpp BMPs and silently falls back to default wizard art.
    $bmp = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear([System.Drawing.Color]::FromArgb(255, 0, 0, 0))
    $g.Dispose()
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Bmp)
    $bmp.Dispose()
}

Save-Bmp24 164 314 (Join-Path $outDir "sidebar.bmp")
Save-Bmp24 150 57 (Join-Path $outDir "header.bmp")

Write-Host "Generated 24bpp bitmaps in $outDir"
